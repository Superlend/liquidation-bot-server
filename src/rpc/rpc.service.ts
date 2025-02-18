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
import { providers } from 'ethers';
import { UserReserveDataHumanizedWithEmode } from '../common/types';

@Injectable()
export class RpcService {
  private provider: providers.JsonRpcProvider[];
  private chainId: number;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {
    this.provider = [
      new providers.JsonRpcProvider(
        'https://plend-etherlink-mainnet-djs2w.zeeve.net/TuychDxGCScIED1nCk0m/rpc',
      ),
      new providers.JsonRpcProvider('https://node.mainnet.etherlink.com'),
    ]; // TODO: setup for backup providers
    this.chainId = 42793;
  }

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
}
