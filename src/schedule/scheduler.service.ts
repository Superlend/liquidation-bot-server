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

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private isLiquidationRunning = false;
  private cronJobName = 'liquidationCron';

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private liquidationService: LiquidationService,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    this.createCronJob();
  }

  async onModuleDestroy() {
    this.deleteCronJob();
  }

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
