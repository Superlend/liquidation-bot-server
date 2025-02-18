import { providers } from 'ethers';

export interface ResultWithError {
  error: any;
  data: any;
}

export interface IndexerDataType {
  user_address: string;
  health_factor: number;
}

export type RpcCall<T> = (
  provider: providers.JsonRpcProvider,
  ...args: any[]
) => Promise<T>;
