import * as fs from 'fs'
import * as mustache from 'mustache'
import * as networkAddresses from '../networks/addresses.json'
import { Addresses } from './addresses.template'

const SepoliaChainID = '11155111'
const SepoliaEnvironment = process.argv[2]

// mustache doesn't like numbered object keys
// eslint-disable-next-line @typescript-eslint/no-explicit-any

let renameAddresses: any = networkAddresses
renameAddresses['sepolia'] = networkAddresses[SepoliaChainID][SepoliaEnvironment]["addresses"]


export let addresses: Addresses = {
  CollateralPoolConfig: '{{sepolia.CollateralPoolConfig}}',
  BookKeeper: '{{sepolia.BookKeeper}}',
  PriceOracle: '{{sepolia.PriceOracle}}',
  PositionManager: '{{sepolia.PositionManager}}',
  FixedSpreadLiquidationStrategy: '{{sepolia.FixedSpreadLiquidationStrategy}}',
  FixedSpreadLiquidationStrategyOld: '{{sepolia.FixedSpreadLiquidationStrategyOld}}',
  StableSwap: '{{sepolia.StableSwap}}',
  CollateralAdapter: '{{sepolia.CollateralAdapter}}',
  blockNumber: networkAddresses[SepoliaChainID][SepoliaEnvironment]["blockNumber"],
  network:  networkAddresses[SepoliaChainID]["network"],
}

const main = (): void => {
  try {
    let output = JSON.parse(mustache.render(JSON.stringify(addresses), renameAddresses))
    // output.blockNumber = '44784237' // Block when first contract was created
    // output.network = 'apothem'
    fs.writeFileSync(__dirname + '/generatedAddresses.json', JSON.stringify(output, null, 2))
  } catch (e) {
    console.log(`Error saving artifacts: ${e.message}`)
  }
}

main()