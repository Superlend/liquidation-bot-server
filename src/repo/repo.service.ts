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

/**
 * Service responsible for database operations related to liquidation data
 * Manages PostgreSQL connection pool and provides methods to query liquidatable positions
 *
 * Implements:
 * - OnModuleInit: Initializes database connection pool on service start
 * - OnModuleDestroy: Cleanly closes database connections on service shutdown
 */
@Injectable()
export class RepoService implements OnModuleInit, OnModuleDestroy {
  /**
   * Shared database connection pool
   * Static to ensure single pool instance across multiple service instances
   */
  private static pool: Pool;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {}

  /**
   * Initializes the database connection pool when the module starts
   * Only creates a new pool if one doesn't already exist
   * Uses database URL from environment configuration
   */
  async onModuleInit() {
    if (!RepoService.pool) {
      const databaseUrl = this.configService.get<string>('DB_URL');

      RepoService.pool = new Pool({ connectionString: databaseUrl });
      this.logger.info('Database pool initialized');
    }
  }

  /**
   * Fetches accounts that are eligible for liquidation
   * @returns Promise<ResultWithError> containing:
   * - data: Array of liquidatable accounts with their health factors
   * - error: Any error that occurred during the query
   *
   * Queries are ordered by health factor ascending (worst positions first)
   * Returns null data and the error object if query fails
   */
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

  /**
   * Cleanly shuts down the database connection pool when the module is destroyed
   * Ensures all queries are completed and connections are properly closed
   */
  async onModuleDestroy() {
    if (RepoService.pool) {
      await RepoService.pool.end();
      this.logger.info('Database pool closed');
    }
  }
}
