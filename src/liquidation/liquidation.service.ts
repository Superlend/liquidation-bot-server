import { Inject, Injectable } from '@nestjs/common';
import { RpcService } from '../rpc/rpc.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Promisify } from '../common/promisifier.helper';
import { IndexerDataType } from '../common/interfaces';
import { RepoService } from '../repo/repo.service';

@Injectable()
export class LiquidationService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private rpcService: RpcService,
    private repoService: RepoService,
  ) {}

  async processLiquidations() {
    try {
      const users = await Promisify<IndexerDataType[]>(
        this.repoService.getLiquidateableUsers(),
      );

      // fetch data for each of the user
      // liquidate at max 10 users at a time
    } catch (error) {
      this.logger.error(`Error in processing liquidations: ${error.stack}`);
    }
  }
}
