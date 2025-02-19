import { Inject, Injectable } from '@nestjs/common';
import { RpcService } from '../rpc/rpc.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Promisify } from '../common/promisifier.helper';
import { RepoService } from '../repo/repo.service';
import { ReservesDataHumanized } from '@aave/contract-helpers';
import {
  POOL_ADDRESSES_PROVIDER,
  UI_POOL_DATA_PROVIDER,
} from '../common/constants';
import {
  LiquidationAsset,
  LiquidationOpportunity,
  LiquidationParams,
  UserReserveDataHumanizedWithEmode,
} from '../common/types';
import { FormatUserSummaryResponse } from '@aave/math-utils';
import { formatUserReserveData } from '../common/formatters';
import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { SmartRouterTrade, V3Pool } from '@iguanadex/smart-router';
import { Token, TradeType } from '@iguanadex/sdk';
import { zeroAddress } from 'viem';
import { IndexerDataType } from '../common/interfaces';

@Injectable()
export class LiquidationService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private rpcService: RpcService,
    private repoService: RepoService,
  ) {}

  async processLiquidations() {
    try {
      // const unhealthyPositions = [
      //   { user_address: '0x991d03d62130bf2e0c1cc44ef358dc7a71b04bea' },
      // ];
      const unhealthyPositions = await Promisify<IndexerDataType[]>(
        this.repoService.getLiquidateableUsers(),
      );

      // fetch data for each of the user
      const reservesData = await Promisify<ReservesDataHumanized>(
        this.rpcService.getAaveReservesData(
          UI_POOL_DATA_PROVIDER,
          POOL_ADDRESSES_PROVIDER,
        ),
      );
      const batchLimit = 10;
      let batchRequests: Promise<FormatUserSummaryResponse>[] = [];
      let userAddresses: string[] = [];
      for (const positions of unhealthyPositions) {
        if (batchRequests.length === batchLimit) {
          this.logger.info(
            `Processing batch [batchSize: ${batchRequests.length}]`,
          );

          // process batch
          const userDatas = await Promise.all(batchRequests);
          await this.processLiquidationBatch(userDatas, userAddresses);

          batchRequests = [];
          userAddresses = [];
        }

        this.logger.info(
          `Adding to batch [postion: ${JSON.stringify(positions)}]`,
        );
        batchRequests.push(
          this.getFormattedUserData(reservesData, positions.user_address),
        );
        userAddresses.push(positions.user_address);
      }

      if (batchRequests.length > 0) {
        const userDatas = await Promise.all(batchRequests);
        await this.processLiquidationBatch(userDatas, userAddresses);
      }

      this.logger.info(`Done processing liquidations`);
    } catch (error) {
      this.logger.error(`Error in processing liquidations: ${error.stack}`);
    }
  }

  private calculateLiquidationProfit(
    collateralAssets: LiquidationAsset[],
    debtAssets: LiquidationAsset[],
    gasCost: number,
    hf: number,
  ) {
    const liqOpportunities: LiquidationOpportunity[] = [];

    for (const collateral of collateralAssets) {
      if (BigNumber.from(collateral.balance).eq(0)) continue;
      const debt = debtAssets[0];
      if (BigNumber.from(debt.balance).eq(0)) continue;

      const maxSeizableCollatInUsd = collateral.balanceUsd;
      const maxDebtCoverableInUsd =
        (maxSeizableCollatInUsd * 10000) / collateral.liquidationBonus;

      let debtToRepayInUsd = hf < 0.95 ? debt.balanceUsd : debt.balanceUsd / 2;
      let seizableCollateralUsd =
        (debtToRepayInUsd * collateral.liquidationBonus) / 10000;

      if (seizableCollateralUsd > maxSeizableCollatInUsd) {
        seizableCollateralUsd = maxSeizableCollatInUsd;
        debtToRepayInUsd = maxDebtCoverableInUsd;
      }
      const cost = debtToRepayInUsd + gasCost; // TODO: include flash loan premium cost
      const profit = seizableCollateralUsd - cost;

      const debtAmountInToken = this.parseUnitsWithRetry(
        String(debtToRepayInUsd / debt.price),
        debt.decimals,
      );
      const seizableAmountInToken = this.parseUnitsWithRetry(
        String(seizableCollateralUsd / collateral.price),
        collateral.decimals,
      );

      if (debtAmountInToken.eq(0)) continue;

      liqOpportunities.push({
        collateralToken: {
          name: collateral.name,
          symbol: collateral.symbol,
          decimals: collateral.decimals,
          address: collateral.address,
          amount: seizableAmountInToken.toString(),
        },
        debtToken: {
          name: debt.name,
          symbol: debt.symbol,
          decimals: debt.decimals,
          address: debt.address,
          amount: debtAmountInToken.toString(),
        },
        profit: profit,
      });
    }

    return liqOpportunities.sort((a, b) => b.profit - a.profit);
  }

  private async getFormattedUserData(
    reservesData: ReservesDataHumanized,
    user_address: string,
  ): Promise<FormatUserSummaryResponse> {
    const userReserveData = await Promisify<UserReserveDataHumanizedWithEmode>(
      this.rpcService.getAaveUserReserveData(
        user_address,
        UI_POOL_DATA_PROVIDER,
        POOL_ADDRESSES_PROVIDER,
      ),
    );

    const userData = await Promisify<FormatUserSummaryResponse>(
      this.rpcService.getAaveUserData(
        user_address,
        reservesData,
        userReserveData,
      ),
    );

    return userData;
  }

  private async processLiquidationBatch(
    usersData: FormatUserSummaryResponse[],
    userAddresses: string[],
  ) {
    for (const [idx, userData] of usersData.entries()) {
      const formattedUserReserveData = formatUserReserveData(
        userData.userReservesData,
      );

      if (Number(userData.healthFactor) >= 1) continue;

      const liqOpps = this.calculateLiquidationProfit(
        formattedUserReserveData.collatAssets,
        formattedUserReserveData.debtAssets,
        0, // keeping gas cost as 0 for now
        Number(userData.healthFactor),
      ); // TODO: add gas cost, slippage and dex fees
      if (!liqOpps[0] || liqOpps[0].profit <= 0) return;

      // calculate the path
      const liqOpp = liqOpps[0];
      const tradePath = await Promisify<SmartRouterTrade<TradeType>>(
        this.rpcService.getTradePath(
          liqOpp.collateralToken.address.toLowerCase(),
          liqOpp.debtToken.address.toLowerCase(),
          liqOpp.collateralToken.amount,
        ),
      );
      if (tradePath.routes.length === 0)
        throw new Error(
          `No dex route exist for ${liqOpp.collateralToken.address} to ${liqOpp.debtToken.address}!`,
        );

      const liquidationParams: LiquidationParams = {
        debtToken: liqOpp.debtToken.address,
        amount: liqOpp.debtToken.amount,
        colToken: liqOpp.collateralToken.address,
        user: userAddresses[idx],
        poolFee1: (tradePath.routes[0].pools[0] as V3Pool).fee,
        poolFee2: 0,
        pathToken: zeroAddress as `0x${string}`,
        usePath: false,
      };

      if (tradePath.routes[0].pools.length > 1) {
        liquidationParams.poolFee2 = (
          tradePath.routes[0].pools[1] as V3Pool
        ).fee;
        liquidationParams.pathToken = (
          tradePath.routes[0].path[1] as Token
        ).address;
        liquidationParams.usePath = true;
      }

      await this.rpcService.exectuteLiquidation(liquidationParams);
    }
  }

  private parseUnitsWithRetry(amount: string, decimals: number): BigNumber {
    try {
      const [integerPart, decimalPart = ''] = amount.split('.');
      const formattedDecimal = (decimalPart + '0'.repeat(decimals)).slice(
        0,
        decimals,
      );

      const formattedAmount = `${integerPart}.${formattedDecimal}`;
      return parseUnits(formattedAmount, decimals);
    } catch (error) {
      return BigNumber.from(0);
    }
  }
}
