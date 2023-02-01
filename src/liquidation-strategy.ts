import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
import {LogFixedSpreadLiquidate} from '../generated/FixedSpreadLiquidationStrategy/FixedSpreadLiquidationStrategy'
import { Position, User } from '../generated/schema'
import { Constants } from "./Utils/Constants"

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
        //In that case mark the position as 'closed'
        if(position.lockedCollateral.equals(Constants.DEFAULT_PRICE) && 
              position.debtShare.equals(Constants.DEFAULT_PRICE)){

                //Reset the position
                position.positionStatus = "closed"
                position.liquidationPrice = BigDecimal.fromString('0')
                position.safetyBuffer = BigDecimal.fromString('0')
                position.safetyBufferInPercent = BigDecimal.fromString('0')
                position.debtValue = BigDecimal.fromString('0')

                //Decrease the position count for user.
                let user = User.load(position.userAddress.toHexString())
                if (user != null) {
                  user.activePositionsCount = user.activePositionsCount.minus(BigInt.fromString('1'))
                  user.save()
                }
          }

        //Increase the liquidation count on a position
        position.liquidationCount  = position.liquidationCount.plus(BigInt.fromI32(1)) 
        position.save()
    }
  }  