import { Injectable } from '@nestjs/common';
import { LiquidationService } from './liquidation/liquidation.service';

@Injectable()
export class AppService {
  constructor(private liqService: LiquidationService) {}

  async getHello(): Promise<string> {
    await this.liqService.processLiquidations();
    return 'Hello World!';
  }
}
