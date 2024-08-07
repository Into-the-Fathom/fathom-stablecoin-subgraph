import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import {LogAdjustPosition, LogSetTotalDebtCeiling, StablecoinIssuedAmount} from "../generated/BookKeeper/BookKeeper"
import {Pool, ProtocolStat, Position, User, PositionActivity } from "../generated/schema"
import { Constants } from "./utils/helper"
import { CollateralPoolConfig } from "../generated/CollateralPoolConfig/CollateralPoolConfig"
import { addresses } from "../config/addresses";


export function adjustPositionHandler(
    event: LogAdjustPosition
  ): void {

    let poolId = event.params._collateralPoolId
    let pool  = Pool.load(poolId.toHexString())
    if(pool != null){
        pool.lockedCollateral = pool.lockedCollateral.plus(event.params._addCollateral.toBigDecimal().div(Constants.WAD.toBigDecimal()))
        pool.totalAvailable = pool.debtCeiling.minus(pool.totalBorrowed)
        pool.tvl = pool.lockedCollateral.times(pool.collateralPrice)
        pool.save()
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

    //update the positions
    let position = Position.load(event.params._positionAddress.toHexString())
    if(position!=null && pool!=null){
        position.lockedCollateral =  event.params._lockedCollateral.toBigDecimal().div(Constants.WAD.toBigDecimal())
        position.debtValue =  Constants.divByRADToDecimal(event.params._positionDebtValue)
        position.debtShare = Constants.divByWADToDecimal(event.params._debtShare)
        position.tvl = position.lockedCollateral.times(pool.collateralPrice)

        //If position debtValue and collateral both zero.. mark it as closed..
        if(position.debtShare.equals(BigDecimal.fromString('0')) && 
             //position.lockedCollateral.equals(BigDecimal.fromString('0')) && 
             position.positionStatus != 'closed'){
              
             //Reset the position data 
             position.positionStatus = 'closed'
             position.safetyBuffer = BigDecimal.fromString('0')
             position.safetyBufferInPercent = BigDecimal.fromString('0')
             position.debtValue = BigDecimal.fromString('0')

              // decrement user position count
              let user = User.load(position.userAddress.toHexString())
              if (user != null) {
                user.activePositionsCount = user.activePositionsCount.minus(BigInt.fromString('1'))
                user.save()
              }
        }

        //Update the liquidation price
        //TODO: Can we put this calculationin smart contracts
        if(pool.priceWithSafetyMargin.gt(BigDecimal.fromString('0')) && 
                             position.lockedCollateral.gt(BigDecimal.fromString('0'))){
          
          let collateralAvailableToWithdraw = (
                                                pool.priceWithSafetyMargin.times(
                                                position.lockedCollateral).minus(position.debtValue)
                                              ).div(pool.priceWithSafetyMargin)

            position.safetyBufferInPercent = collateralAvailableToWithdraw.div(position.lockedCollateral)
        }

        position.save()

        //Create position activity
        createPositionAcitity(event.params._positionAddress.toHexString(), event)
    } 
  }

  function createPositionAcitity(positionAddress: string, event: LogAdjustPosition): void {
    
    const positionDebtShare = Constants.divByWADToDecimal(event.params._debtShare)
    const debtShareAdded = Constants.divByWADToDecimal(event.params._addDebtShare)
    const collateralAdded = Constants.divByWADToDecimal(event.params._addCollateral)

    let debtAccumulatedRate = BigDecimal.fromString('1');

    //Calculated the debtAccumulatedRate if debtShare is not 0
    if(! positionDebtShare.equals(BigDecimal.fromString('0'))){
        let collateralPoolConfig = CollateralPoolConfig.bind(Address.fromString(addresses.CollateralPoolConfig))
        debtAccumulatedRate = Constants.divByRAYToDecimal(collateralPoolConfig.try_getDebtAccumulatedRate(event.params._collateralPoolId).value)
    }

    //derive the activity state
    let activityState = 'topup'
    
    if(positionDebtShare.equals(BigDecimal.fromString('0'))){
      //if debtShare is zero, it means position is closed
      activityState = 'closed'
    }else if(debtShareAdded.lt(BigDecimal.fromString('0'))){ 
      //if debtShare is negative, it means debt is repaid
      activityState = 'repay'
    }
    
    const positionActivityKey = Constants.POSITION_ACTIVITY_PREFIX_KEY + "-" + event.transaction.hash.toHexString()
    let positionActivity = PositionActivity.load(positionActivityKey)
    if (positionActivity === null) {
        positionActivity = new PositionActivity(positionActivityKey)
        positionActivity.activityState = activityState
        positionActivity.collateralAmount = collateralAdded
        positionActivity.debtAmount = debtShareAdded.times(debtAccumulatedRate)
        positionActivity.position = positionAddress
        positionActivity.blockNumber = event.block.number
        positionActivity.blockTimestamp = event.block.timestamp
        positionActivity.transaction = event.transaction.hash
        positionActivity.save()
    }
  }

  export function setTotalDebtCeilingHanlder(
    event: LogSetTotalDebtCeiling
  ): void {
    let protocolStat  = ProtocolStat.load(Constants.FATHOM_STATS_KEY)
    if(protocolStat == null){
        protocolStat = new ProtocolStat(Constants.FATHOM_STATS_KEY)
        protocolStat.tvl = BigDecimal.fromString('0')
        protocolStat.pools = []
        protocolStat.totalSupply = BigInt.fromI32(0)
    }else{
      protocolStat.totalSupply = Constants.divByRAD(event.params._totalDebtCeiling)
    }
    protocolStat.save()

  }

  export function stablecoinIssuedAmountHandler(
    event: StablecoinIssuedAmount
  ): void {
    let poolId = event.params._collateralPoolId
    let pool  = Pool.load(poolId.toHexString())
    if(pool != null){
      pool.totalBorrowed =  Constants.divByRAD(event.params._poolStablecoinIssued)
      pool.totalAvailable = pool.debtCeiling.minus(pool.totalBorrowed)
      pool.save()
    }
  }