import { Address, BigDecimal, BigInt, Bytes, log } from "@graphprotocol/graph-ts"
import {LogRemainingDailySwapAmount,LogSwapStablecoinToToken,LogSwapTokenToStablecoin, StableSwapModule} from "../generated/StableSwapModule/StableSwapModule"
import { StableSwapStat, SwapEvent } from "../generated/schema"
import { addresses } from "../config/addresses"


export function remainingDailySwapLimitHandler(
    event:LogRemainingDailySwapAmount
    ): void {
        let stableSwapStat = getOrCreateStableSwapStat()
        if(stableSwapStat!=null){
            stableSwapStat.remainingDailySwapAmount = event.params._remainingDailySwapAmount;
            stableSwapStat.save()
        }
    }

export function swapStablecoinToTokenHandler(
    event: LogSwapStablecoinToToken
    ): void {
        let startTime = Date.now()

        let stableSwapStat = getOrCreateStableSwapStat()
        stableSwapStat.totalStablecoinToTokenSwapEvents = stableSwapStat.totalStablecoinToTokenSwapEvents.plus(BigInt.fromString('1'))

        const swapEventId = event.transaction.hash
            .toHexString()
            .concat('-')
            .concat(event.transactionLogIndex.toString())

        let swapEvent = new SwapEvent(swapEventId)
        swapEvent.fee = event.params._fee;
        swapEvent.owner = event.params._owner;
        swapEvent.value = event.params._value;
        swapEvent.isTokenToStablecoinSwap = false
        swapEvent.isStablecoinToTokenSwap = true
        swapEvent.blockNumber = event.block.number
        swapEvent.blockTimestamp = event.block.timestamp
        swapEvent.transaction = event.transaction.hash
        stableSwapStat.stablecoinToTokenTotalSwapValue = stableSwapStat.stablecoinToTokenTotalSwapValue.plus(event.params._value);
        swapEvent.save()
        stableSwapStat.save()

        let endTime = Date.now()
        let duration = endTime - startTime
      
        log.debug('LogSwapStablecoinToToken Event processed in {} ms', [duration.toString()])

    }

export function swapTokenToStablecoinHandler(
    event: LogSwapTokenToStablecoin
    ): void {
        let stableSwapStat = getOrCreateStableSwapStat()
        stableSwapStat.totalTokenToStablecoinSwapEvents = stableSwapStat.totalTokenToStablecoinSwapEvents.plus(BigInt.fromString('1'))

        const swapEventId = event.transaction.hash
            .toHexString()
            .concat('-')
            .concat(event.transactionLogIndex.toString())

        let swapEvent = new SwapEvent(swapEventId)
        swapEvent.fee = event.params._fee;
        swapEvent.owner = event.params._owner;
        swapEvent.value = event.params._value;
        swapEvent.isTokenToStablecoinSwap = true
        swapEvent.isStablecoinToTokenSwap = false
        swapEvent.blockNumber = event.block.number
        swapEvent.blockTimestamp = event.block.timestamp
        swapEvent.transaction = event.transaction.hash
        stableSwapStat.tokenToStablecoinTotalSwapValue = stableSwapStat.tokenToStablecoinTotalSwapValue.plus(event.params._value)
        swapEvent.save()
        stableSwapStat.save()
   }

function getOrCreateStableSwapStat(): StableSwapStat {
        let stableSwapStat = StableSwapStat.load(addresses.StableSwap)
        let stableSwap = StableSwapModule.bind(Address.fromString(addresses.StableSwap))
        if (stableSwapStat == null){
            stableSwapStat = new StableSwapStat(addresses.StableSwap)
            stableSwapStat.totalTokenToStablecoinSwapEvents = BigInt.fromString('0')
            stableSwapStat.totalStablecoinToTokenSwapEvents = BigInt.fromString('0')
            stableSwapStat.remainingDailySwapAmount = stableSwap.remainingDailySwapAmount()
            stableSwapStat.tokenToStablecoinTotalSwapValue = BigInt.fromString('0')
            stableSwapStat.stablecoinToTokenTotalSwapValue = BigInt.fromString('0')
        }
        return stableSwapStat
    }