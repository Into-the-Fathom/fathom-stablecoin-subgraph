import { BigDecimal, BigInt, ByteArray } from "@graphprotocol/graph-ts";
import {LogSetPrice} from "../generated/PriceOracle/PriceOracle"
import { Pool, Position } from "../generated/schema";
import { Constants } from "./Utils/Constants";

export function priceUpdateHandler(event: LogSetPrice): void {
    let poolId = event.params._poolId;
    let pool  = Pool.load(poolId.toHexString())
    if(pool != null){
        //Price is not set yet...
        if(pool.collateralPrice == Constants.DEFAULT_PRICE && 
            pool.collateralLastPrice == Constants.DEFAULT_PRICE){
                pool.collateralPrice = pool.collateralLastPrice = event.params._rawPriceUint.div(Constants.WAD).toBigDecimal()
        }else{
            //Assign the price to old price and then update the current price to latest.
            pool.collateralLastPrice = pool.collateralPrice
            pool.collateralPrice = event.params._rawPriceUint.div(Constants.WAD).toBigDecimal()
        }

        pool.priceWithSafetyMargin = Constants.divByRAYToDecimal(event.params._priceWithSafetyMargin)
        pool.tvl = pool.lockedCollateral.times(pool.collateralPrice)
        pool.save()

        //Update the safety buffer for positions
        let _debtAccumulatedRate = pool.debtAccumulatedRate
        // let _priceWithSafetyMargin = event.params._priceWithSafetyMargin
        for (let i = 0; i < pool.positions.length; ++i) {
            let pos  = Position.load(pool.positions[i])
            //TODO: Check if below check can be simplified with closed position status
            if(pos != null && pos.debtShare.notEqual(BigDecimal.fromString('0'))
                            && pos.lockedCollateral.notEqual(BigDecimal.fromString('0'))){
                let collateralValue = pos.lockedCollateral.times(pool.priceWithSafetyMargin)
                let debtValue = pos.debtShare
                pos.safetyBuffer = collateralValue.ge(debtValue) ? collateralValue.minus(debtValue) : BigDecimal.fromString('0')

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
                                                    pos.lockedCollateral).minus(pos.debtShare)
                                                )
                                                .div(pool.priceWithSafetyMargin)
                                                
                        // pos.liquidationPrice = pool.collateralPrice.minus(
                        //                     (
                        //                         collateralAvailableToWithdraw.times(pool.priceWithSafetyMargin))
                        //                         .div(pos.lockedCollateral
                        //                     )
                        //                 )

                        pos.safetyBufferInPercent = collateralAvailableToWithdraw.div(pos.lockedCollateral)
                }

                pos.tvl = pos.lockedCollateral.times(pool.collateralPrice) 
                pos.save()
            }
        }
    }
}