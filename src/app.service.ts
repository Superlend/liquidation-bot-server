import { Injectable } from '@nestjs/common';
import { Promisify } from './common/promisifier.helper';
import { IndexerDataType } from './common/interfaces';
import { RepoService } from './repo/repo.service';

@Injectable()
export class AppService {
  constructor(private dataService: RepoService) {}

  async getHello(): Promise<string> {
    const res = await Promisify<IndexerDataType[]>(
      this.dataService.getLiquidateableUsers(),
    );
    console.log(res);
    return 'Hello World!';
  }
}
