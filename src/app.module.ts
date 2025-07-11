import { APP_CONFIG, DB_CONFIG } from './lib/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuctionModule } from './modules/auction/auction.module';
import { UsersModule } from './modules/users/users.module';
import { WebsocketModule } from './common/websocket.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...DB_CONFIG,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: APP_CONFIG.nodeEnv !== 'production',
      logging: APP_CONFIG.nodeEnv !== 'production',
    }),
    AuctionModule,
    UsersModule,
    WebsocketModule,
  ],
  controllers: [AppController],
})
export class AppModule {} 