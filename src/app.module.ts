import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LiquidationModule } from './liquidation/liquidation.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import { DBModule } from './db/db.module';
import { ConfigModule } from '@nestjs/config';
import { RepoModule } from './repo/repo.module';

@Module({
  imports: [
    WinstonModule.forRoot({
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.printf(
          (info) =>
            `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`,
        ),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.colorize({ all: true }),
        }),
        new winston.transports.File({
          dirname: path.join('logs/'),
          filename: 'combined.log',
        }),
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DBModule.forRoot(),
    RepoModule,
    LiquidationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
