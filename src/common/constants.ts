import { ChainId, WETH9, WXTZ } from '@iguanadex/sdk';
import { USDC, USDT, WBTC } from '@iguanadex/tokens';
import { Chain } from 'viem';

export const UI_POOL_DATA_PROVIDER =
  '0x9F9384Ef6a1A76AE1a95dF483be4b0214fda0Ef9';
export const POOL_ADDRESSES_PROVIDER =
  '0x5ccF60c7E10547c5389E9cBFf543E5D0Db9F4feC';
export const POOL = '';
export const LIQUIDATION_HELPER = '0x9af37dBd72adE6c0c9b0D3F3750863C2303d9926';

export const getViemEtherlinkConfig = (nodeUrls: string[]) => {
  return {
    id: 42_793,
    name: 'Etherlink',
    network: 'etherlink',
    nativeCurrency: {
      decimals: 18,
      name: 'tez',
      symbol: 'XTZ',
    },
    rpcUrls: {
      public: { http: [nodeUrls[1]] },
      default: { http: [nodeUrls[0]] },
    },
    blockExplorers: {
      etherscan: {
        name: 'Etherscout',
        url: 'https://explorer.etherlink.com/',
      },
      default: { name: 'Etherscout', url: 'https://explorer.etherlink.com/' },
    },
    contracts: {
      multicall3: {
        address: '0xcA11bde05977b3631167028862bE2a173976CA11',
        blockCreated: 33899,
      },
    },
  } as const satisfies Chain;
};

export const IguanaSubgraphV2 =
  'https://api.studio.thegraph.com/query/69431/exchange-v2-etherlink/version/latest';
export const IguanaSubgraphV3 =
  'https://api.studio.thegraph.com/query/69431/exchange-v3-etherlink/version/latest';

export const EtherlinkTokens = {
  '0xc9b53ab2679f573e480d01e0f49e2b5cfb7a3eab': WXTZ[ChainId.ETHERLINK],
  '0x2c03058c8afc06713be23e58d2febc8337dbfe6a': USDT[ChainId.ETHERLINK],
  '0x796ea11fa2dd751ed01b53c372ffdb4aaa8f00f9': USDC[ChainId.ETHERLINK],
  '0xfc24f770f94edbca6d6f885e12d4317320bcb401': WETH9[ChainId.ETHERLINK],
  '0xbfc94cd2b1e55999cfc7347a9313e88702b83d0f': WBTC[ChainId.ETHERLINK],
};
