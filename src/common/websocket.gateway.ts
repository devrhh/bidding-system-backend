import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface BidUpdateData {
  auctionId: number;
  newHighestBid: number;
  bidderId: number;
  bidderName: string;
  timeLeft: number;
  timeLeftFormatted: string;
}

interface AuctionUpdateData {
  auctionId: number;
  name: string;
  currentHighestBid: number;
  timeLeft: number;
  timeLeftFormatted: string;
  totalBids: number;
  isExpired: boolean;
}

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

  @SubscribeMessage('joinAuction')
  handleJoinAuction(client: Socket, auctionId: number) {
    client.join(`auction_${auctionId}`);
    console.log(`Client ${client.id} joined auction ${auctionId}`);
  }

  @SubscribeMessage('leaveAuction')
  handleLeaveAuction(client: Socket, auctionId: number) {
    client.leave(`auction_${auctionId}`);
    console.log(`Client ${client.id} left auction ${auctionId}`);
  }

  emitBidUpdate(data: BidUpdateData) {
    this.server.to(`auction_${data.auctionId}`).emit('bidUpdate', data);
    this.server.emit('globalBidUpdate', data); // Emit to all connected clients
    console.log(`Bid update emitted for auction ${data.auctionId}: $${data.newHighestBid}`);
  }

  emitAuctionUpdate(data: AuctionUpdateData) {
    this.server.to(`auction_${data.auctionId}`).emit('auctionUpdate', data);
    this.server.emit('globalAuctionUpdate', data);
    console.log(`Auction update emitted for auction ${data.auctionId}`);
  }

  emitAuctionExpired(auctionId: number) {
    this.server.to(`auction_${auctionId}`).emit('auctionExpired', { auctionId });
    this.server.emit('globalAuctionExpired', { auctionId });
    console.log(`Auction expired notification emitted for auction ${auctionId}`);
  }

  emitUserCount(auctionId: number, count: number) {
    this.server.to(`auction_${auctionId}`).emit('userCount', { auctionId, count });
  }
} 