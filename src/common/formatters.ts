import {
  ComputedUserReserve,
  FormatReserveUSDResponse,
} from '@aave/math-utils';
import { LiquidationAsset } from './types';
import { parseUnits } from 'ethers/lib/utils';

export const formatUserReserveData = (
  userReservesData: ComputedUserReserve<FormatReserveUSDResponse>[],
) => {
  const collatAssets: LiquidationAsset[] = [];
  const debtAssets: LiquidationAsset[] = [];

  userReservesData.forEach(
    (userReserve: ComputedUserReserve<FormatReserveUSDResponse>) => {
      const decimals = userReserve.reserve.decimals;

      const balance = parseUnits(userReserve.underlyingBalance, decimals);
      const debt = parseUnits(userReserve.totalBorrows, decimals);

      if (balance.gt(0)) {
        collatAssets.push({
          name: userReserve.reserve.name,
          symbol: userReserve.reserve.symbol,
          address: userReserve.reserve.underlyingAsset,
          decimals: decimals,

          balance: balance.toString(),
          balanceUsd: Number(userReserve.underlyingBalanceUSD),

          price: Number(userReserve.reserve.priceInUSD),
          liquidationBonus: Number(
            userReserve.reserve.formattedReserveLiquidationBonus,
          ),
        });
      }

      if (debt.gt(0)) {
        debtAssets.push({
          name: userReserve.reserve.name,
          symbol: userReserve.reserve.symbol,
          address: userReserve.reserve.underlyingAsset,
          decimals: decimals,

          balance: debt.toString(),
          balanceUsd: Number(userReserve.totalBorrowsUSD),

          price: Number(userReserve.reserve.priceInUSD),
          liquidationBonus: Number(userReserve.reserve.reserveLiquidationBonus),
        });
      }
    },
  );

  return { collatAssets, debtAssets };
};
