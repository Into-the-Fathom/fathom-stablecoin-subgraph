import {
  LogNewPosition,
  PositionManager,

} from "../generated/PositionManager/PositionManager"
import { Position, User} from "../generated/schema"


import {
  Address,
  BigDecimal,
  BigInt
} from "@graphprotocol/graph-ts";
import { addresses } from "../config/addresses";

export function newPositionHandler(event: LogNewPosition): void {

    let positionManager = PositionManager.bind(Address.fromString(addresses.PositionManager))
    let positionAddress = positionManager.positions(event.params._positionId)
    let poolId = positionManager.collateralPools(event.params._positionId)

    let position = new Position(positionAddress.toHexString())
    position.positionId = event.params._positionId;
    position.positionAddress = positionAddress;
    position.userAddress = event.params._usr;
    position.walletAddress = event.params._own;
    position.collateralPool = poolId
    position.collateralPoolName = poolId.toString()
    position.lockedCollateral = BigDecimal.fromString('0')
    position.debtShare = BigDecimal.fromString('0')
    position.debtValue = BigDecimal.fromString('0')
    position.safetyBuffer = BigDecimal.fromString('1')
    position.safetyBufferInPercent = BigDecimal.fromString('1')
    position.tvl = BigDecimal.fromString('0')
    position.positionStatus = 'safe'
    position.liquidationCount = BigInt.fromI32(0)
    position.blockNumber = event.block.number
    position.blockTimestamp = event.block.timestamp
    position.transaction = event.transaction.hash
    position.pool = poolId.toHexString()
    position.save()

    //     load user account 
    let user = User.load(event.params._usr.toHexString())

    if(user == null){
      user = new User(event.params._usr.toHexString())  
      user.address = event.params._usr
      user.activePositionsCount = BigInt.fromString('1')
    } else {
      // increment positions count 
      user.activePositionsCount = user.activePositionsCount.plus(BigInt.fromString('1'))
    }
    // save 
    user.save()
}