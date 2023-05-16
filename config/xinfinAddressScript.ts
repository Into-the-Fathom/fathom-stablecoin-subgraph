import * as fs from 'fs'
import * as mustache from 'mustache'
import * as networkAddresses from '../networks/addresses.json'
import { Addresses } from './addresses.template'

// mustache doesn't like numbered object keys
// eslint-disable-next-line @typescript-eslint/no-explicit-any

let renameAddresses: any = networkAddresses
renameAddresses['xinfin'] = networkAddresses['50'][process.argv[2]]["addresses"]


export let addresses: Addresses = {
  CollateralPoolConfig: '{{xinfin.CollateralPoolConfig}}',
  BookKeeper: '{{xinfin.BookKeeper}}',
  PriceOracle: '{{xinfin.PriceOracle}}',
  PositionManager: '{{xinfin.PositionManager}}',
  FixedSpreadLiquidationStrategy: '{{xinfin.FixedSpreadLiquidationStrategy}}',
  StableSwap: '{{xinfin.StableSwap}}',
  CollateralAdapter: '{{xinfin.CollateralAdapter}}',
  blockNumber: networkAddresses['50'][process.argv[2]]["blockNumber"],
  network:  networkAddresses['50']["network"],
}

const main = (): void => {
  try {
    let output = JSON.parse(mustache.render(JSON.stringify(addresses), renameAddresses))
    fs.writeFileSync(__dirname + '/generatedAddresses.json', JSON.stringify(output, null, 2))
  } catch (e) {
    console.log(`Error saving artifacts: ${e.message}`)
  }
}

main()