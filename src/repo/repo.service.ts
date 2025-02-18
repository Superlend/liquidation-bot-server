import { Client } from '@libsql/client/.';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { InjectLibSqlClient } from 'nestjs-libsql-client';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';

@Injectable()
export class RepoService {
  constructor(
    @InjectLibSqlClient() private client: Client,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  async getLiquidateableUsers(): Promise<ResultWithError> {
    try {
      this.logger.info(`Fetching liquidatable users`);

      const result = await this.client.execute({
        sql: 'SELECT user_address, health_factor FROM USER_2 ORDER BY health_factor ASC',
        args: [],
      });

      const rows = result.rows;
      this.logger.info(
        `Succesfully fetched ${rows.length} users to be liquidated`,
      );

      return { data: rows, error: null };
    } catch (error) {
      this.logger.error(`Error in fetching liquidatable users: ${error.stack}`);
      return { data: null, error };
    }
  }
}
