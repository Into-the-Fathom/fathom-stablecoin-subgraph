import {
  LogNewPosition,
  PositionManager,

} from "../generated/PositionManager/PositionManager"
import { Position, PositionActivity, User} from "../generated/schema"


import {
  Address,
  BigDecimal,
  BigInt,
  Bytes
} from "@graphprotocol/graph-ts";
import { addresses } from "../config/addresses";
import { Constants } from "./utils/helper";
import { BookKeeper } from "../generated/BookKeeper/BookKeeper";

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

    // create position activity
    createPositionAcitity(positionAddress, event, poolId)

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

function createPositionAcitity(positionAddress: Address, event: LogNewPosition, poolId: Bytes): void {
  const positionActivityKey = Constants.POSITION_ACTIVITY_PREFIX_KEY + "-" + event.transaction.hash.toHexString()
  let bookeKeeper = BookKeeper.bind(Address.fromString(addresses.BookKeeper))
  let positionResult = bookeKeeper.positions(poolId,positionAddress)
  
  let positionActivity = PositionActivity.load(positionActivityKey)
  if (positionActivity === null) {
      positionActivity = new PositionActivity(positionActivityKey)
      positionActivity.activityState = 'created'
      positionActivity.collateralAmount = positionResult.getLockedCollateral().toBigDecimal()
      positionActivity.debtAmount = positionResult.getDebtShare().toBigDecimal()
      positionActivity.position = positionAddress.toHexString()
      positionActivity.blockNumber = event.block.number
      positionActivity.blockTimestamp = event.block.timestamp
      positionActivity.transaction = event.transaction.hash
      positionActivity.save()
  }
}

