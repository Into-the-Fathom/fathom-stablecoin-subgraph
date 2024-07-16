import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { addresses } from "../config/addresses";
import { CollateralPoolConfig } from "../generated/CollateralPoolConfig/CollateralPoolConfig";
import {LogSetPrice} from "../generated/PriceOracle/PriceOracle"
import { Pool, ProtocolStat } from "../generated/schema";
import { Constants } from "./utils/helper";

export function priceUpdateHandler(event: LogSetPrice): void {

    let poolId = event.params._poolId;
    let pool  = Pool.load(poolId.toHexString())
    if(pool != null){
        //Price is not set yet...
        if(pool.collateralPrice == Constants.DEFAULT_PRICE && 
            pool.collateralLastPrice == Constants.DEFAULT_PRICE){
                pool.collateralPrice = pool.collateralLastPrice = Constants.divByWADToDecimal(event.params._rawPrice)
        }else{
            //Assign the price to old price and then update the current price to latest.
            pool.collateralLastPrice = pool.collateralPrice
            pool.collateralPrice = Constants.divByWADToDecimal(event.params._rawPrice)
        }

        pool.priceWithSafetyMargin = Constants.divByRAYToDecimal(event.params._priceWithSafetyMargin)
        pool.rawPrice = Constants.divByWADToDecimal(event.params._rawPrice)
        pool.tvl = pool.lockedCollateral.times(pool.collateralPrice)
        pool.save()

        //Update the safety buffer for positions
        let collateralPoolConfig = CollateralPoolConfig.bind(Address.fromString(addresses.CollateralPoolConfig))
        let _debtAccumulatedRate = Constants.divByRAYToDecimal(collateralPoolConfig.try_getDebtAccumulatedRate(poolId).value)

        let positions = pool.positions.load()

        for (let i = 0; i < positions.length; ++i) {
            let pos  = positions[i]
            if(pos != null && pos.debtValue.notEqual(BigDecimal.fromString('0'))
                            && pos.lockedCollateral.notEqual(BigDecimal.fromString('0'))){
                let collateralValue = pos.lockedCollateral.times(pool.priceWithSafetyMargin)
                pos.debtValue = pos.debtShare.times(_debtAccumulatedRate)
                pos.safetyBuffer = collateralValue.ge(pos.debtValue) ? collateralValue.minus(pos.debtValue) : BigDecimal.fromString('0')

                //Check if position is unsafe or not
                if(pos.safetyBuffer.equals(BigDecimal.fromString('0'))){
                    pos.positionStatus = 'unsafe'
                }else{
                    pos.positionStatus = 'safe'
                }

                if(pool.priceWithSafetyMargin.gt(BigDecimal.fromString('0')) && 
                            pos.lockedCollateral.gt(BigDecimal.fromString('0'))){
                            
                    let collateralAvailableToWithdraw = (
                                                pool.priceWithSafetyMargin.times(
                                                    pos.lockedCollateral).minus(pos.debtValue)
                                                )
                                                .div(pool.priceWithSafetyMargin)

                        pos.safetyBufferInPercent = collateralAvailableToWithdraw.div(pos.lockedCollateral)
                }

                pos.tvl = pos.lockedCollateral.times(pool.collateralPrice) 
                pos.save()
            }
        }

        // Update the total TVL in protcol by adding the TVLs from all pools
        let stats  = ProtocolStat.load(Constants.FATHOM_STATS_KEY)
        let aggregatedTVL = BigDecimal.fromString('0')
        if(stats != null){
            for (let i = 0; i < stats.pools.length; ++i) {
                let pool  = Pool.load(stats.pools[i])
                if (pool != null){
                    aggregatedTVL = aggregatedTVL.plus(pool.tvl)
                }
            }
            stats.tvl = aggregatedTVL
            stats.save()
        }
        
    }
}