import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  BidUpdateData,
  AuctionUpdateData,
  NewAuctionData,
  WEBSOCKET_EVENTS,
} from './websocket.constants';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.JOIN_AUCTION)
  handleJoinAuction(client: Socket, auctionId: number) {
    client.join(`auction_${auctionId}`);
    console.log(`Client ${client.id} joined auction ${auctionId}`);
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.LEAVE_AUCTION)
  handleLeaveAuction(client: Socket, auctionId: number) {
    client.leave(`auction_${auctionId}`);
    console.log(`Client ${client.id} left auction ${auctionId}`);
  }

  emitBidUpdate(data: BidUpdateData & { timestamp?: number }) {
    this.server.to(`auction_${data.auctionId}`).emit(WEBSOCKET_EVENTS.BID_UPDATE, {
      ...data,
      timestamp: Date.now(),
    });
  }

  emitAuctionUpdate(data: AuctionUpdateData & { timestamp?: number }) {
    this.server.to(`auction_${data.auctionId}`).emit(WEBSOCKET_EVENTS.AUCTION_UPDATE, {
      ...data,
      timestamp: Date.now(),
    });
  }

  emitNewAuction(data: NewAuctionData) {
    this.server.emit(WEBSOCKET_EVENTS.NEW_AUCTION, data);
    console.log(`New auction notification emitted: ${data.name} (ID: ${data.auctionId})`);
  }
} 