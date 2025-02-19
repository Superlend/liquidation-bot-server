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

export type LiquidationParams = {
  debtToken: string;
  amount: string;
  colToken: string;
  user: string;
  poolFee1: number;
  poolFee2: number;
  pathToken: `0x${string}`;
  usePath: boolean;
};
