import { UserReserveDataHumanized } from '@aave/contract-helpers';

export interface UserReserveDataHumanizedWithEmode {
  userReserves: UserReserveDataHumanized[];
  userEmodeCategoryId: number;
}

export type LiquidationAsset = {
  // token details
  name: string;
  symbol: string;
  address: string;
  decimals: number;

  // balance details
  balance: string;
  balanceUsd: number;

  // protocol details
  price: number;
  liquidationBonus: number;
};

export type LiquidationOpportunity = {
  collateralToken: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
    amount: string;
  };
  debtToken: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
    amount: string;
  };
  profit: number;
};
