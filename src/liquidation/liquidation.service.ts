import { Inject, Injectable } from '@nestjs/common';
import { RpcService } from '../rpc/rpc.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Promisify } from '../common/promisifier.helper';
import { IndexerDataType } from '../common/interfaces';
import { RepoService } from '../repo/repo.service';
import { ReservesDataHumanized } from '@aave/contract-helpers';

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
      const result = await Promisify<ReservesDataHumanized>(
        this.rpcService.getAaveReservesData(
          '0x9F9384Ef6a1A76AE1a95dF483be4b0214fda0Ef9',
          '0x5ccF60c7E10547c5389E9cBFf543E5D0Db9F4feC',
        ),
      );

      console.log(JSON.stringify(result));

      // liquidate at max 10 users at a time
    } catch (error) {
      this.logger.error(`Error in processing liquidations: ${error.stack}`);
    }
  }
}
