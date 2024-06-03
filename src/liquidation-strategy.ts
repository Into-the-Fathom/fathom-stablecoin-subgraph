import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import {LogFixedSpreadLiquidate} from '../generated/FixedSpreadLiquidationStrategy/FixedSpreadLiquidationStrategy'
import { Position, User } from '../generated/schema'
import { Constants } from "./Utils/Constants"

export function positionLiquidationHandler(
    event: LogFixedSpreadLiquidate
  ): void {
    let startTime = new Date().getTime()

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

        let endTime = new Date().getTime()
        let duration = endTime - startTime
      
        log.info('LogFixedSpreadLiquidate Event processed in {} ms', [duration.toString()])
    
    }
  }  