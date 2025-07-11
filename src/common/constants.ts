import { ChainId, ERC20Token, WETH9, WXTZ } from '@iguanadex/sdk';
import { USDC, USDT, WBTC } from '@iguanadex/tokens';
import { Chain } from 'viem';

export const UI_POOL_DATA_PROVIDER =
  '0x9F9384Ef6a1A76AE1a95dF483be4b0214fda0Ef9';
export const POOL_ADDRESSES_PROVIDER =
  '0x5ccF60c7E10547c5389E9cBFf543E5D0Db9F4feC';
export const LIQUIDATION_HELPER = '0x3E6c69d19Bb2ba159dC6ebfb28FD81e697363311';

export const getViemEtherlinkConfig = (nodeUrls: string[]) => {
  return {
    id: ChainId.ETHERLINK,
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
  '0x2247b5a46bb79421a314ab0f0b67ffd11dd37ee4': new ERC20Token(
    ChainId.ETHERLINK,
    '0x2247b5a46bb79421a314ab0f0b67ffd11dd37ee4',
    18,
    'mBASIS',
  ),
  '0xdd629e5241cbc5919847783e6c96b2de4754e438': new ERC20Token(
    ChainId.ETHERLINK,
    '0xdd629e5241cbc5919847783e6c96b2de4754e438',
    18,
    'mTBILL',
  ),
  '0xecac9c5f704e954931349da37f60e39f515c11c1': new ERC20Token(
    ChainId.ETHERLINK,
    '0xecac9c5f704e954931349da37f60e39f515c11c1',
    8,
    'LBTC',
  ),
  '0x01f07f4d78d47a64f4c3b2b65f513f15be6e1854': new ERC20Token(
    ChainId.ETHERLINK,
    '0x01f07f4d78d47a64f4c3b2b65f513f15be6e1854',
    6,
    'stXTZ',
  ),
};

export const hTokenToUnderlyingToken = {
  '0x1bed8fc148864fec86eb18472f36093350770bd6':
    '0xc9B53AB2679f573e480d01e0f49e2B5CFB7a3EAb',
  '0x65203ede18ce1ee9e8a3b11b31a8dc5444d2c799':
    '0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9',
  '0xe0ffcd16980cb54d33c56b49e65697603e9b92e5':
    '0xbfc94cd2b1e55999cfc7347a9313e88702b83d0f',
  '0x925dc026d8b5b9d64d82ae3fd3280a4bc2514364':
    '0xfc24f770F94edBca6D6f885E12d4317320BcB401',
  '0x1cd88fBD530281Ad6c639E2B897c4E239003A930':
    '0xc9B53AB2679f573e480d01e0f49e2B5CFB7a3EAb',
};

export const hTokenToVault = {
  '0x1bed8fc148864fec86eb18472f36093350770bd6':
    '0x4f2210992209Ad0aB0c8644547Bf0379B96Ed1F4',
  '0x65203ede18ce1ee9e8a3b11b31a8dc5444d2c799':
    '0xec24ead8022190509992275559b57e7ed3c95e66',
  '0xe0ffcd16980cb54d33c56b49e65697603e9b92e5':
    '0xB50221737075e28f44123A5bb89eaEA285722318',
  '0x925dc026d8b5b9d64d82ae3fd3280a4bc2514364':
    '0xB8e5e6519277BF3C961684b47313A3553cb0dD46',
  '0x1cd88fBD530281Ad6c639E2B897c4E239003A930':
    '0x4C911bf7A008C497719CBEb1a376f1cEc9e2c1d6',
};
