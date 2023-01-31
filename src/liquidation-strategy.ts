  import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"
  import { BookKeeper, BookKeeper__positionsResult } from "../generated/BookKeeper/BookKeeper"
  import { CollateralPoolConfig } from "../generated/CollateralPoolConfig/CollateralPoolConfig"
  import {LogFixedSpreadLiquidate} from '../generated/FixedSpreadLiquidationStrategy/FixedSpreadLiquidationStrategy'
  import { Position, User } from '../generated/schema'
  import { Constants } from "./Utils/Constants"
  import { addresses } from "../config/addresses"

  export function positionLiquidationHandler(
      event: LogFixedSpreadLiquidate
    ): void {
      let position = Position.load(event.params._positionAddress.toHexString().toLowerCase())
      if(position!=null){
          let bookKeeper = BookKeeper.bind(Address.fromString(addresses.BookKeeper))
          let respose:BookKeeper__positionsResult = bookKeeper.positions(event.params._collateralPoolId,event.params._positionAddress)
          
          //Get updated locked collateral and debtValue
          position.lockedCollateral  = respose.getLockedCollateral().toBigDecimal().div(Constants.WAD.toBigDecimal())
          
          //TODO: Calculate with debtAccumulatedRate to convert to debtValue
          let collateralConfig = CollateralPoolConfig.bind(Address.fromString(addresses.CollateralPoolConfig))
          let debtAccumulatedRate = Constants.divByRAYToDecimal(collateralConfig.getDebtAccumulatedRate(event.params._collateralPoolId))
          position.debtValue  = Constants.divByRADToDecimal(respose.getDebtShare()).times(debtAccumulatedRate)
          position.debtShare = Constants.divByWADToDecimal(event.params._positionDebtShare)
  
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