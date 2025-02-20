import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RepoService implements OnModuleInit, OnModuleDestroy {
  private static pool: Pool; // Shared pool across instances

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (!RepoService.pool) {
      const databaseUrl = this.configService.get<string>('DB_URL');

      RepoService.pool = new Pool({ connectionString: databaseUrl });
      this.logger.info('Database pool initialized');
    }
  }

  async getLiquidateableUsers(): Promise<ResultWithError> {
    try {
      this.logger.info('Fetching liquidatable users');

      const result = await RepoService.pool.query(
        'SELECT user_address, health_factor FROM liquidatable_accounts ORDER BY health_factor ASC',
      );

      this.logger.info(
        `Successfully fetched ${result.rows.length} users to be liquidated`,
      );
      return { data: result.rows, error: null };
    } catch (error) {
      this.logger.error(`Error fetching liquidatable users: ${error.stack}`);
      return { data: null, error };
    }
  }

  async onModuleDestroy() {
    if (RepoService.pool) {
      await RepoService.pool.end();
      this.logger.info('Database pool closed');
    }
  }
}
