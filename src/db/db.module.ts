import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LibSqlModule } from 'nestjs-libsql-client';
import { Config } from '@libsql/client/.';

@Module({})
export class DBModule {
  public static getConnectionOptions(configService: ConfigService): Config {
    const url = configService.get('LIB_SQL_URL');
    return { url };
  }

  public static forRoot(): DynamicModule {
    return {
      module: DBModule,
      imports: [
        LibSqlModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) =>
            DBModule.getConnectionOptions(configService),
        }),
      ],
      controllers: [],
      providers: [],
      exports: [],
    };
  }
}
