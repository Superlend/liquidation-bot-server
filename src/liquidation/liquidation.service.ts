import { Inject, Injectable } from '@nestjs/common';
import { RpcService } from '../rpc/rpc.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Promisify } from '../common/promisifier.helper';
import { IndexerDataType } from '../common/interfaces';
import { RepoService } from '../repo/repo.service';
import { ReservesDataHumanized } from '@aave/contract-helpers';
import {
  POOL_ADDRESSES_PROVIDER,
  UI_POOL_DATA_PROVIDER,
} from '../common/constants';
import {
  LiquidationAsset,
  LiquidationOpportunity,
  UserReserveDataHumanizedWithEmode,
} from '../common/types';
import { FormatUserSummaryResponse } from '@aave/math-utils';
import { formatUserReserveData } from '../common/formatters';
import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

@Injectable()
export class LiquidationService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private rpcService: RpcService,
    private repoService: RepoService,
  ) {}

  async processLiquidations() {
    try {
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
      for (const positions of unhealthyPositions) {
        const [userReserveData] = await Promise.all([
          Promisify<UserReserveDataHumanizedWithEmode>(
            this.rpcService.getAaveUserReserveData(
              positions.user_address,
              UI_POOL_DATA_PROVIDER,
              POOL_ADDRESSES_PROVIDER,
            ),
          ),
        ]);

        const userData = await Promisify<FormatUserSummaryResponse>(
          this.rpcService.getAaveUserData(
            positions.user_address,
            reservesData,
            userReserveData,
          ),
        );

        const formattedUserReserveData = formatUserReserveData(
          userData.userReservesData,
        );

        const liqOpp = this.calculateLiquidationProfit(
          formattedUserReserveData.collatAssets,
          formattedUserReserveData.debtAssets,
          0,
          Number(userData.healthFactor),
        );

        console.log(liqOpp);
      }

      // liquidate at max 10 users at a time
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

      for (const debt of debtAssets) {
        if (BigNumber.from(debt.balance).eq(0)) continue;

        const maxSeizableCollatInUsd = collateral.balanceUsd;
        const maxDebtCoverableInUsd =
          (maxSeizableCollatInUsd * 10000) / collateral.liquidationBonus;

        let debtToRepayInUsd =
          hf < 0.95 ? debt.balanceUsd : debt.balanceUsd / 2;
        let seizableCollateralUsd =
          (debtToRepayInUsd * collateral.liquidationBonus) / 10000;

        if (seizableCollateralUsd > maxSeizableCollatInUsd) {
          seizableCollateralUsd = maxSeizableCollatInUsd;
          debtToRepayInUsd = maxDebtCoverableInUsd;
        }
        const cost = debtToRepayInUsd + gasCost;
        const profit = seizableCollateralUsd - cost;

        const debtAmountInToken = parseUnits(
          String((debtToRepayInUsd / debt.price).toFixed(debt.decimals + 2)),
          debt.decimals,
        );

        liqOpportunities.push({
          collateralToken: {
            name: collateral.name,
            symbol: collateral.symbol,
            decimals: collateral.decimals,
            address: collateral.address,
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
    }

    return liqOpportunities.sort((a, b) => b.profit - a.profit);
  }
}
