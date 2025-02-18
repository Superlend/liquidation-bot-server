import { UserReserveDataHumanized } from '@aave/contract-helpers';

export interface UserReserveDataHumanizedWithEmode {
  userReserves: UserReserveDataHumanized[];
  userEmodeCategoryId: number;
}
