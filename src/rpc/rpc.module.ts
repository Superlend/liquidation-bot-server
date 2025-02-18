import { Module } from '@nestjs/common';
import { RpcService } from './rpc.service';

@Module({
  imports: [],
  providers: [RpcService],
  exports: [RpcService],
})
export class RpcModule {}
