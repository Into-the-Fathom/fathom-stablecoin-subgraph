// AS compiler does not like interface
export class Addresses {
    CollateralPoolConfig: string
    BookKeeper: string
    PriceOracle: string
    PositionManager: string
    FixedSpreadLiquidationStrategy: string
    StableSwap: string
    AnkrCollateralAdapter: string
    blockNumber: string
    network: string
  }
  
  // AS compiler does not like const
  export let addresses: Addresses = {
    CollateralPoolConfig: '{{CollateralPoolConfig}}',
    BookKeeper: '{{BookKeeper}}',
    PriceOracle: '{{PriceOracle}}',
    PositionManager: '{{PositionManager}}',
    FixedSpreadLiquidationStrategy: '{{FixedSpreadLiquidationStrategy}}',
    StableSwap: '{{StableSwap}}',
    AnkrCollateralAdapter: '{{AnkrCollateralAdapter}}',
    blockNumber: '{{blockNumber}}',
    network: '{{network}}'
  }