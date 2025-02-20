import {
  ComputedUserReserve,
  FormatReserveUSDResponse,
} from '@aave/math-utils';
import { LiquidationAsset } from './types';
import { parseUnits } from 'ethers/lib/utils';

/**
 * Formats user reserve data from Aave into collateral and debt assets
 * @param userReservesData Array of user reserve data from Aave protocol
 * @returns Object containing arrays of collateral and debt assets
 *
 * This function processes raw Aave user reserve data and separates it into:
 * - collatAssets: Assets the user has supplied as collateral
 * - debtAssets: Assets the user has borrowed
 *
 * For each asset, it:
 * - Converts balance/debt amounts to proper decimal precision using parseUnits
 * - Extracts relevant asset information (name, symbol, address, etc.)
 * - Calculates USD values
 * - Includes liquidation bonus information
 *
 * The debt assets are sorted by USD value in descending order
 */
export const formatUserReserveData = (
  userReservesData: ComputedUserReserve<FormatReserveUSDResponse>[],
) => {
  const collatAssets: LiquidationAsset[] = [];
  const debtAssets: LiquidationAsset[] = [];

  userReservesData.forEach(
    (userReserve: ComputedUserReserve<FormatReserveUSDResponse>) => {
      const decimals = userReserve.reserve.decimals;

      // Convert balance and debt to proper decimal precision
      const balance = parseUnits(userReserve.underlyingBalance, decimals);
      const debt = parseUnits(userReserve.totalBorrows, decimals);

      // If user has supplied this asset as collateral
      if (balance.gt(0)) {
        collatAssets.push({
          name: userReserve.reserve.name,
          symbol: userReserve.reserve.symbol,
          address: userReserve.reserve.underlyingAsset,
          decimals: decimals,

          balance: balance.toString(),
          balanceUsd: Number(userReserve.underlyingBalanceUSD),

          price: Number(userReserve.reserve.priceInUSD),
          liquidationBonus: Number(userReserve.reserve.reserveLiquidationBonus),
        });
      }

      // If user has borrowed this asset
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

  // Sort debt assets by USD value in descending order
  debtAssets.sort((a, b) => b.balanceUsd - a.balanceUsd);

  return { collatAssets, debtAssets };
};
