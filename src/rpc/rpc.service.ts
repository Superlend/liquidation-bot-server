import {
  ReservesDataHumanized,
  UiPoolDataProvider,
} from '@aave/contract-helpers';
import {
  formatReserves,
  formatUserSummary,
  FormatUserSummaryResponse,
} from '@aave/math-utils';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError, RpcCall } from '../common/interfaces';
import { getAddress } from 'ethers/lib/utils';
import { Contract, providers, Wallet } from 'ethers';
import {
  LiquidationParams,
  UserReserveDataHumanizedWithEmode,
} from '../common/types';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import {
  EtherlinkTokens,
  getViemEtherlinkConfig,
  IguanaSubgraphV2,
  IguanaSubgraphV3,
  LIQUIDATION_HELPER,
} from '../common/constants';
import { SmartRouter } from '@iguanadex/smart-router';
import { CurrencyAmount, TradeType } from '@iguanadex/sdk';
import { GraphQLClient } from 'graphql-request';
import {
  abi,
  FlashLiquidations,
} from '../common/types/contracts/liquidationHelper/flashLiquidation';
import { ConfigService } from '@nestjs/config';

/**
 * Service responsible for handling all RPC (Remote Procedure Call) interactions
 * Manages connections to blockchain nodes, Aave protocol, and DEX (Decentralized Exchange) services
 * Provides methods for fetching data and executing transactions with failover support
 */
@Injectable()
export class RpcService {
  private provider: providers.JsonRpcProvider[];
  private viemClient: PublicClient<Transport, Chain>;
  private iguanaSubgraphClientV2: any;
  private iguanaSubgraphClientV3: any;

  private liquidatorPvtKey: string;
  private chainId: number;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {
    const nodeUrls = [
      this.configService.get('NODE_URL_PRIMARY'),
      this.configService.get('NODE_URL_BACKUP'),
    ];

    this.liquidatorPvtKey = this.configService.get('PRIVATE_KEY');

    this.provider = [
      new providers.JsonRpcProvider(nodeUrls[0]),
      new providers.JsonRpcProvider(nodeUrls[1]),
    ];
    this.chainId = this.configService.get('CHAIN_ID');

    this.viemClient = createPublicClient({
      chain: getViemEtherlinkConfig(nodeUrls),
      transport: http(nodeUrls[0]),
      batch: {
        multicall: {
          batchSize: 1024 * 200,
        },
      },
    });

    this.iguanaSubgraphClientV3 = new GraphQLClient(IguanaSubgraphV3);
    this.iguanaSubgraphClientV2 = new GraphQLClient(IguanaSubgraphV2);
  }

  /**
   * Fetches Aave protocol reserve data
   * @param uiPoolDataProviderAddress Address of Aave's UI pool data provider contract
   * @param lendingPoolAddressProvider Address of Aave's lending pool address provider
   * @returns Promise with reserve data or error
   *
   * Gets current state of all assets in Aave protocol including:
   * - Asset prices
   * - Interest rates
   * - Liquidation parameters
   */
  async getAaveReservesData(
    uiPoolDataProviderAddress: string,
    lendingPoolAddressProvider: string,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Fetching aave reserve data [uiPoolDataProvider: ${uiPoolDataProviderAddress}, lendingPoolAddressesProvider: ${lendingPoolAddressProvider}]`,
      );

      const result = await this.ethCallWithRetry((_provider) => {
        const uiPoolDataProviderInstance = new UiPoolDataProvider({
          uiPoolDataProviderAddress: getAddress(uiPoolDataProviderAddress),
          provider: _provider,
          chainId: this.chainId,
        });

        return uiPoolDataProviderInstance.getReservesHumanized({
          lendingPoolAddressProvider: getAddress(lendingPoolAddressProvider),
        });
      }, this.chainId);

      this.logger.info(
        `Succesfully fetched reserve data [uiPoolDataProvider: ${uiPoolDataProviderAddress}, lendingPoolAddressesProvider: ${lendingPoolAddressProvider}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching aave reserves data [uiPoolDataProvider: ${uiPoolDataProviderAddress}, lendingPoolAddressesProvider: ${lendingPoolAddressProvider}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Fetches specific user's reserve data from Aave
   * @param userAddress Address of the user to query
   * @param uiPoolDataProviderAddress Address of Aave's UI data provider
   * @param lendingPoolAddressProvider Address of lending pool provider
   * @returns Promise with user's positions data or error
   *
   * Gets user's current positions including:
   * - Supplied assets
   * - Borrowed assets
   * - Health factor
   */
  async getAaveUserReserveData(
    userAddress: string,
    uiPoolDataProviderAddress: string,
    lendingPoolAddressProvider: string,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Fetching user reserve data [userAddress:${userAddress}, uiPoolDataProvider: ${uiPoolDataProviderAddress}, lendingPoolAddressesProvider: ${lendingPoolAddressProvider}]`,
      );

      const result: UserReserveDataHumanizedWithEmode =
        await this.ethCallWithRetry((_provider) => {
          const uiPoolDataProviderInstance = new UiPoolDataProvider({
            uiPoolDataProviderAddress: getAddress(uiPoolDataProviderAddress),
            provider: _provider,
            chainId: this.chainId,
          });

          return uiPoolDataProviderInstance.getUserReservesHumanized({
            lendingPoolAddressProvider: getAddress(lendingPoolAddressProvider),
            user: getAddress(userAddress),
          });
        }, this.chainId);

      this.logger.info(
        `Succesfully fetched user reserve data [userAddress:${userAddress}, uiPoolDataProvider: ${uiPoolDataProviderAddress}, lendingPoolAddressesProvider: ${lendingPoolAddressProvider}]`,
      );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching user reserve data [userAddress:${userAddress}, uiPoolDataProvider: ${uiPoolDataProviderAddress}, lendingPoolAddressesProvider: ${lendingPoolAddressProvider}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Formats and calculates user-specific data using Aave's math utils
   * @param userAddress Target user's address
   * @param reserveData Current state of all reserves
   * @param userData User's raw reserve data
   * @returns Formatted user summary with calculated metrics
   *
   * Processes raw data to calculate:
   * - USD values
   * - Health factors
   * - Liquidation thresholds
   */
  async getAaveUserData(
    userAddress: string,
    reserveData: ReservesDataHumanized,
    userData: UserReserveDataHumanizedWithEmode,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Fetching user specific data [userAddress: ${userAddress}]`,
      );

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const baseCurrencyData = reserveData.baseCurrencyData;

      const formattedPoolReserves = formatReserves({
        reserves: reserveData.reservesData as any,
        currentTimestamp,
        marketReferenceCurrencyDecimals:
          baseCurrencyData.marketReferenceCurrencyDecimals,
        marketReferencePriceInUsd:
          baseCurrencyData.marketReferenceCurrencyPriceInUsd,
      }).map((r) => ({
        ...r,
        isEmodeEnabled: (r as any)?.eModeCategoryId !== 0,
        isWrappedBaseAsset: false,
      }));

      const user: FormatUserSummaryResponse = formatUserSummary({
        currentTimestamp: currentTimestamp,
        marketReferencePriceInUsd:
          baseCurrencyData.marketReferenceCurrencyPriceInUsd,
        marketReferenceCurrencyDecimals:
          baseCurrencyData.marketReferenceCurrencyDecimals,
        userReserves: userData.userReserves,
        formattedReserves: formattedPoolReserves,
        userEmodeCategoryId: userData.userEmodeCategoryId,
      });

      return { data: user, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching user specific data [userAddress: ${userAddress}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Makes RPC calls with automatic failover to backup providers
   * @param rpcCall Function making the actual RPC call
   * @param chainId Target blockchain network ID
   * @param args Additional arguments for the RPC call
   * @returns Promise of the RPC call result
   *
   * Attempts calls on primary node, falls back to backup nodes if primary fails
   */
  async ethCallWithRetry<T>(
    rpcCall: RpcCall<T>,
    chainId: number,
    ...args: any[]
  ): Promise<T> {
    for (const [idx, provider] of this.provider.entries()) {
      this.logger.info(
        `Trying to fetch data [chainId : ${chainId}, providerPriority: ${idx}]`,
      );
      try {
        return await rpcCall(provider, ...args);
      } catch (error) {
        this.logger.error(
          `Error in fetching data [provider : ${provider?.connection?.url}, priority : ${idx}] : ${error.stack}`,
        );
      }
    }
    throw new Error('All RPC calls failed!');
  }

  /**
   * Similar to ethCallWithRetry but specifically for contract transactions
   * @param rpcCall Function making the contract call
   * @param chainId Target blockchain network ID
   * @param args Additional arguments for the contract call
   * @returns Promise of the transaction result
   */
  async contractCallWithRetry<T>(
    rpcCall: RpcCall<T>,
    chainId: number,
    ...args: any[]
  ): Promise<T> {
    for (const [idx, provider] of this.provider.entries()) {
      this.logger.info(
        `Trying to make transaction [chainId : ${chainId}, providerPriority: ${idx}]`,
      );
      try {
        return await rpcCall(provider, ...args);
      } catch (error) {
        this.logger.error(
          `Error in make transaction [provider : ${provider?.connection?.url}, priority : ${idx}] : ${error.stack}`,
        );
      }
    }
    throw new Error('All RPC calls failed!');
  }

  /**
   * Calculates optimal trading path for token swap using IguanaDEX
   * @param fromTokenAddress Source token address
   * @param toTokenAddress Target token address
   * @param amountToSell Amount of source token to swap
   * @returns Best trading route with minimal price impact
   *
   * Considers both V2 and V3 liquidity pools to find:
   * - Best price execution
   * - Optimal routing through multiple pools
   * - Gas costs for different paths
   */
  async getTradePath(
    fromTokenAddress: string,
    toTokenAddress: string,
    amountToSell: string,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Fetching trading path [fromToken: ${fromTokenAddress}, toToken: ${toTokenAddress}, amountToSell: ${amountToSell}]`,
      );
      const swapFrom = EtherlinkTokens[fromTokenAddress];
      const swapTo = EtherlinkTokens[toTokenAddress];

      const quoteProvider = SmartRouter.createQuoteProvider({
        onChainProvider: () => this.viemClient,
      });
      const amount = CurrencyAmount.fromRawAmount(swapFrom, amountToSell);

      const [v2Pools, v3Pools] = await Promise.all([
        SmartRouter.getV2CandidatePools({
          onChainProvider: () => this.viemClient,
          v2SubgraphProvider: () => this.iguanaSubgraphClientV2,
          v3SubgraphProvider: () => this.iguanaSubgraphClientV3,
          currencyA: amount.currency,
          currencyB: swapTo,
        }),
        SmartRouter.getV3CandidatePools({
          onChainProvider: () => this.viemClient,
          subgraphProvider: () => this.iguanaSubgraphClientV3,
          currencyA: amount.currency,
          currencyB: swapTo,
          subgraphFallback: false,
        }),
      ]);
      const pools = [...v2Pools, ...v3Pools];
      const trade = await SmartRouter.getBestTrade(
        amount,
        swapTo,
        TradeType.EXACT_INPUT,
        {
          gasPriceWei: () => this.viemClient.getGasPrice(),
          maxHops: 2,
          maxSplits: 2,
          poolProvider: SmartRouter.createStaticPoolProvider(pools),
          quoteProvider,
          quoterOptimization: true,
        },
      );

      return { data: trade, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching trading path [fromToken: ${fromTokenAddress}, toToken: ${toTokenAddress}, amountToSell: ${amountToSell}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Executes liquidation transaction on-chain
   * @param liquidationParams Parameters for the liquidation including:
   * - Debt token and amount
   * - Collateral token
   * - User address
   * - DEX pool fees and routing
   * @returns Transaction receipt or error
   *
   * Performs:
   * 1. Flash loan for liquidation
   * 2. Liquidation of position
   * 3. Token swap through DEX
   * 4. Repayment of flash loan
   */
  async exectuteLiquidation(
    liquidationParams: LiquidationParams,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Executing liquidation [params: ${JSON.stringify(liquidationParams)}]`,
      );
      const contract = <FlashLiquidations>new Contract(LIQUIDATION_HELPER, abi);
      const tx = await this.contractCallWithRetry(
        async (provider: providers.JsonRpcProvider) => {
          const wallet = new Wallet(this.liquidatorPvtKey, provider);
          return await contract
            .connect(wallet)
            .executeLiquidation(
              liquidationParams.debtToken,
              liquidationParams.amount,
              liquidationParams.colToken,
              liquidationParams.user,
              liquidationParams.poolFee1,
              liquidationParams.poolFee2,
              liquidationParams.pathToken,
              liquidationParams.usePath,
            );
        },
        this.chainId,
      );

      const receipt = await tx.wait(2);

      this.logger.info(
        `Succesfully executed liquidation [params: ${JSON.stringify(liquidationParams)}, txHash: ${receipt.transactionHash}]`,
      );
      return { data: receipt, error: null };
    } catch (error) {
      this.logger.error(
        `Error in executing liquidation [params: ${JSON.stringify(liquidationParams)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
