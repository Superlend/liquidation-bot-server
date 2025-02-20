import {
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { LiquidationService } from '../liquidation/liquidation.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

/**
 * Service responsible for scheduling and managing liquidation jobs
 * Uses cron jobs to periodically check and process liquidatable positions
 *
 * Implements:
 * - OnModuleInit: Sets up the liquidation cron job on service start
 * - OnModuleDestroy: Cleans up the cron job on service shutdown
 */
@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  /**
   * Flag to prevent multiple liquidation jobs from running simultaneously
   * Ensures only one instance of the liquidation process runs at a time
   */
  private isLiquidationRunning = false;

  /**
   * Unique identifier for the liquidation cron job
   * Used for managing the job in the scheduler registry
   */
  private cronJobName = 'liquidationCron';

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private liquidationService: LiquidationService,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Initializes the service by creating the liquidation cron job
   * Called automatically when the module is initialized
   */
  async onModuleInit() {
    this.createCronJob();
  }

  /**
   * Cleans up by removing the liquidation cron job
   * Called automatically when the module is destroyed
   */
  async onModuleDestroy() {
    this.deleteCronJob();
  }

  /**
   * Creates and registers the liquidation cron job
   * Gets cron schedule from environment config or uses default (every 5 minutes)
   * Adds the job to the scheduler registry and starts it
   */
  private createCronJob() {
    const cronTime = this.configService.get<string>(
      'LIQUIDATION_CRON_EXPRESSION',
      '*/5 * * * *',
    );

    this.logger.info(`Setting up liquidation cron with schedule: ${cronTime}`);

    const job = new CronJob(cronTime, async () => {
      await this.handleLiquidation();
    });

    this.schedulerRegistry.addCronJob(this.cronJobName, job);
    job.start();
  }

  /**
   * Handles the liquidation process execution
   * Implements a locking mechanism to prevent concurrent runs
   *
   * Process:
   * 1. Checks if a liquidation is already running
   * 2. If not, sets the lock and processes liquidations
   * 3. Ensures lock is released even if process fails
   * 4. Logs any errors that occur during processing
   */
  async handleLiquidation() {
    if (this.isLiquidationRunning) {
      this.logger.info(
        `Liquidation cron already running. Skipping this cycle...`,
      );
      return;
    }

    this.isLiquidationRunning = true;
    try {
      await this.liquidationService.processLiquidations();
    } catch (error) {
      this.logger.error(`Error in running liquidation cron: ${error.stack}`);
    } finally {
      this.isLiquidationRunning = false;
    }
  }

  /**
   * Removes the liquidation cron job from the scheduler
   * Called during service shutdown to ensure clean cleanup
   * Logs any errors that occur during removal
   */
  private deleteCronJob() {
    try {
      this.schedulerRegistry.deleteCronJob(this.cronJobName);
      this.logger.info(`Liquidation cron job removed.`);
    } catch (error) {
      this.logger.warn(
        `Failed to remove liquidation cron job: ${error.message}`,
      );
    }
  }
}
