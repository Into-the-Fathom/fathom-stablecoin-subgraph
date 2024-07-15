import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import {LogFixedSpreadLiquidate} from '../generated/FixedSpreadLiquidationStrategy/FixedSpreadLiquidationStrategy'
import { Position, PositionActivity, User } from '../generated/schema'
import { Constants } from "./utils/helper"
import { CollateralPoolConfig } from "../generated/CollateralPoolConfig/CollateralPoolConfig"
import { addresses } from "../config/addresses"


export function positionLiquidationHandler(
    event: LogFixedSpreadLiquidate
  ): void {

    let position = Position.load(event.params._positionAddress.toHexString().toLowerCase())
    if(position!=null){
          //Get updated locked collateral and debtValue
        position.lockedCollateral  = position.lockedCollateral.minus(Constants.divByWADToDecimal(event.params._collateralAmountToBeLiquidated))
        
        position.debtShare = position.debtShare.minus(Constants.divByWADToDecimal(event.params._actualDebtShareToBeLiquidated))
        position.debtValue = position.debtValue.minus(Constants.divByRADToDecimal(event.params._actualDebtValueToBeLiquidated))

        //If lockedCollateral & debtValue both are zero that means position is confiscated..
        //If lockedCollateral is zero and debt is still non-zero.. then debt will be moved to baddebt and
        //In above cases mark the position as 'closed'
        if((position.lockedCollateral.equals(Constants.DEFAULT_PRICE) && 
              position.debtShare.equals(Constants.DEFAULT_PRICE)) || 
              position.lockedCollateral.equals(Constants.DEFAULT_PRICE)){

                //Reset the position
                position.positionStatus = "closed"
                position.safetyBuffer = Constants.DEFAULT_PRICE
                position.safetyBufferInPercent = Constants.DEFAULT_PRICE
                position.debtShare= Constants.DEFAULT_PRICE
                position.debtValue = Constants.DEFAULT_PRICE

                //Decrease the position count for user.
                let user = User.load(position.userAddress.toHexString())
                if (user != null) {
                  user.activePositionsCount = user.activePositionsCount.minus(BigInt.fromString('1'))
                  user.save()
                }
          }

          //If all debt is taken but collat is there.. position should be safe.. not closed.. 
          //user can still manually close the position to claim the pending lockedCollateral.
          if(position.lockedCollateral.gt(Constants.DEFAULT_PRICE) && 
                position.debtShare.equals(Constants.DEFAULT_PRICE)){
                  position.positionStatus = "safe"
                  //Putting the below values in safe range...
                  //TODO: Check if we calculate those positions dynamically
                  position.safetyBuffer = BigDecimal.fromString('1')
                  position.safetyBufferInPercent = BigDecimal.fromString('1')
          }

        //Increase the liquidation count on a position
        position.liquidationCount  = position.liquidationCount.plus(BigInt.fromI32(1)) 
        position.save()

        //Create position activity
        createPositionAcitity(event.params._positionAddress.toHexString(), event)

    }
  }
  
  function createPositionAcitity(positionAddress: string, event: LogFixedSpreadLiquidate): void {
    const positionActivityKey = Constants.POSITION_ACTIVITY_PREFIX_KEY + "-" + event.transaction.hash.toHexString()
    let positionActivity = PositionActivity.load(positionActivityKey)
    

    const debtShare = Constants.divByWADToDecimal(event.params._actualDebtShareToBeLiquidated)

    let debtAccumulatedRate = BigDecimal.fromString('1');
  
    //Calculated the debtAccumulatedRate if debtShare is not 0
    if(! debtShare.equals(BigDecimal.fromString('0'))){
        const collateralPoolConfig = CollateralPoolConfig.bind(Address.fromString(addresses.CollateralPoolConfig))
        debtAccumulatedRate = Constants.divByRAYToDecimal(collateralPoolConfig.try_getDebtAccumulatedRate(event.params._collateralPoolId).value)
    }
    
    if (positionActivity === null) {
        positionActivity = new PositionActivity(positionActivityKey)
        positionActivity.activityState = 'liquidation'
        positionActivity.collateralAmount = Constants.divByWADToDecimal(event.params._collateralAmountToBeLiquidated)
        positionActivity.debtAmount = debtShare.times(debtAccumulatedRate)
        positionActivity.position = positionAddress
        positionActivity.blockNumber = event.block.number
        positionActivity.blockTimestamp = event.block.timestamp
        positionActivity.transaction = event.transaction.hash
        positionActivity.save()
    }
  }
  