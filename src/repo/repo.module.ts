import { Module } from '@nestjs/common';
import { LibSqlModule } from 'nestjs-libsql-client';
import { RepoService } from './repo.service';

@Module({
  imports: [LibSqlModule.injectClient()],
  providers: [RepoService],
  exports: [RepoService],
})
export class RepoModule {}
