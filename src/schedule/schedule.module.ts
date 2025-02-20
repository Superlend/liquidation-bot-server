import { Module } from '@nestjs/common';
import { LiquidationModule } from '../liquidation/liquidation.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [LiquidationModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
