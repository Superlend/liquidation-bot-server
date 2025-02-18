import { Module } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';

@Module({
  imports: [RepoModule],
  providers: [],
})
export class LiquidationModule {}
