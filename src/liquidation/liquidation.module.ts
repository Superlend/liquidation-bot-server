import { Module } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { RpcModule } from '../rpc/rpc.module';
import { LiquidationService } from './liquidation.service';

@Module({
  imports: [RepoModule, RpcModule],
  providers: [LiquidationService],
  exports: [LiquidationService],
})
export class LiquidationModule {}
