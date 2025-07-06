import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { Auction } from './auction.entity';
import { Bid } from './bid.entity';
import { User } from '../users/users.entity';
import { WebsocketGateway } from '../../common/websocket.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Auction, Bid, User])],
  controllers: [AuctionController],
  providers: [AuctionService, WebsocketGateway],
  exports: [AuctionService],
})
export class AuctionModule {} 