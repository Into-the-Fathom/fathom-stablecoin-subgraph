import { Address, BigDecimal, BigInt, Bytes, log } from "@graphprotocol/graph-ts"
import { addresses } from "../config/addresses"
import { LogCertsInflow, LogCertsOutflow } from "../generated/AnkrCollateralAdapter/AnkrCollateralAdapter";
import { AnkrCollateralTransactions } from "../generated/schema";


export function ankrCertInFlowHandler(
    event:LogCertsInflow
    ): void {
        let ankrCollateralTransactions = getOrCreateAnkrCertTransactionEntity()
        if(ankrCollateralTransactions!=null){
            ankrCollateralTransactions.totalCertIn = ankrCollateralTransactions.totalCertIn.plus(event.params._valCerts);
            ankrCollateralTransactions.save()
        }
}

export function ankrCertOutFlowHandler(
    event:LogCertsOutflow
    ): void {
        let ankrCollateralTransactions = getOrCreateAnkrCertTransactionEntity()
        if(ankrCollateralTransactions!=null){
            ankrCollateralTransactions.totalCertOut = ankrCollateralTransactions.totalCertOut.plus(event.params._valCerts);;
            ankrCollateralTransactions.save()
        }
}

function getOrCreateAnkrCertTransactionEntity(): AnkrCollateralTransactions {
    let ankrCollateralTransactions = AnkrCollateralTransactions.load(addresses.AnkrCollateralAdapter)
    if (ankrCollateralTransactions == null){
        ankrCollateralTransactions = new AnkrCollateralTransactions(addresses.AnkrCollateralAdapter)
        ankrCollateralTransactions.totalCertIn = BigInt.fromString('0')
        ankrCollateralTransactions.totalCertOut = BigInt.fromString('0')
    }
    return ankrCollateralTransactions
}
