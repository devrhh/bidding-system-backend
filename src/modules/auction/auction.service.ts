import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Auction } from './auction.entity';
import { Bid } from './bid.entity';
import { User } from '../users/users.entity';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { WebsocketGateway } from '../../common/websocket.gateway';

export interface AuctionResult {
  id: number;
  name: string;
  description: string;
  startingPrice: number;
  finalPrice: number;
  totalBids: number;
  winner: {
    id: number;
    name: string;
    email: string;
    amount: number;
  } | null;
  auctionEndTime: Date;
  status: string;
}

export interface ActiveAuctionWithTimeLeft {
  id: number;
  name: string;
  description: string;
  startingPrice: number;
  currentHighestBid: number;
  timeLeft: number;
  timeLeftFormatted: string;
  isExpired: boolean;
  totalBids: number;
  highestBidder: {
    id: number;
    name: string;
    amount: number;
  } | null;
  auctionEndTime: Date;
}

@Injectable()
export class AuctionService {
  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private websocketGateway: WebsocketGateway,
  ) {}

  async createAuction(createAuctionDto: CreateAuctionDto): Promise<Auction> {
    let auctionEndTime: Date;

    if (createAuctionDto.auctionEndTime) {
      auctionEndTime = new Date(createAuctionDto.auctionEndTime);
    } else if (createAuctionDto.durationMinutes) {
      auctionEndTime = new Date(Date.now() + createAuctionDto.durationMinutes * 60 * 1000);
    } else {
      throw new BadRequestException('Either auctionEndTime or durationMinutes must be provided');
    }

    const auction = this.auctionRepository.create({
      name: createAuctionDto.name,
      description: createAuctionDto.description,
      startingPrice: createAuctionDto.startingPrice,
      auctionEndTime,
    });
    
    const savedAuction = await this.auctionRepository.save(auction);
    
    // Schedule auction expiration
    this.scheduleAuctionExpiration(savedAuction.id, auctionEndTime);
    
    // Emit new auction notification via WebSocket
    this.websocketGateway.emitNewAuction({
      auctionId: savedAuction.id,
      name: savedAuction.name,
      description: savedAuction.description,
      startingPrice: savedAuction.startingPrice,
      auctionEndTime: savedAuction.auctionEndTime,
      timeLeft: savedAuction.timeLeft,
      timeLeftFormatted: savedAuction.timeLeftFormatted,
    });
    
    return savedAuction;
  }

  async getAllAuctions(): Promise<Auction[]> {
    return await this.auctionRepository.find({
      where: { isActive: true },
      relations: ['bids'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAuctionById(id: number): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { id, isActive: true },
      relations: ['bids', 'bids.user'],
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    return auction;
  }

  // Placing bid logic
  async placeBid(placeBidDto: PlaceBidDto): Promise<Bid> {
    const { auctionId, userId, amount } = placeBidDto;

    try {
      return await this.dataSource.transaction(async (manager) => {
        // Fetch the auction
        const auction = await manager.findOne(Auction, { where: { id: auctionId, isActive: true }, relations: ['bids'] });
        if (!auction) throw new NotFoundException(`Auction with ID ${auctionId} not found`);
        if (auction.isExpired) throw new BadRequestException('Auction has already ended');

        // check for bid amount
        const currentHighestBid = auction.currentHighestBid ?? auction.startingPrice;
        if (amount <= currentHighestBid) {
          throw new BadRequestException(`Bid must be higher than current highest value ($${currentHighestBid})`);
        }

        // Atomic update for highest bid
        const updateResult = await manager.createQueryBuilder()
          .update(Auction)
          .set({ currentHighestBid: amount })
          .where("id = :auctionId AND isActive = true AND (currentHighestBid IS NULL OR currentHighestBid < :amount)", { auctionId, amount })
          .execute();

        if (updateResult.affected === 0) {
          throw new BadRequestException('Bid was not high enough, or auction is not active.');
        }

        // Create the bid
        const bid = manager.create(Bid, {
          auctionId,
          userId,
          amount,
        });
        const savedBid = await manager.save(Bid, bid);

        // Get the complete bid with user details
        const completeBid = await manager.findOne(Bid, {
          where: { id: savedBid.id },
          relations: ['user'],
        });

        // Get the updated total bids count for this auction
        const totalBids = await manager.count(Bid, { where: { auctionId } });


        // Emit real-time update via WebSocket
        this.websocketGateway.emitBidUpdate({
          auctionId,
          newHighestBid: amount,
          bidderId: userId,
          bidderName: completeBid.user.firstName,
          timeLeft: auction.timeLeft,
          timeLeftFormatted: auction.timeLeftFormatted,
          totalBids,
        });

        // Also emit auction update
        this.websocketGateway.emitAuctionUpdate({
          auctionId,
          name: auction.name,
          currentHighestBid: amount,
          timeLeft: auction.timeLeft,
          timeLeftFormatted: auction.timeLeftFormatted,
          totalBids,
          isExpired: auction.isExpired,
        });

        return completeBid;
      });
    } catch (error) {
      throw error;
    }
  }

  // ALTERNATIVE: Queue-based approach for very high concurrency
  async placeBidWithQueue(placeBidDto: PlaceBidDto): Promise<Bid> {
    const { auctionId, userId, amount } = placeBidDto;

    // 1. Quick validation without locking
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId, isActive: true },
      select: ['id', 'currentHighestBid', 'startingPrice', 'auctionEndTime'],
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    if (auction.isExpired) {
      throw new BadRequestException('Auction has already ended');
    }

    const currentHighestBid = auction.currentHighestBid || auction.startingPrice;
    if (amount <= currentHighestBid) {
      throw new BadRequestException(
        `Bid must be higher than current highest bid ($${currentHighestBid})`,
      );
    }

    // 2. Use database function that handles concurrency internally
    const result = await this.dataSource.query(
      'SELECT place_bid_optimistic($1, $2, $3) as bid_id',
      [auctionId, userId, amount]
    );

    if (!result[0].bid_id) {
      throw new BadRequestException('Bid placement failed. Please try again.');
    }

    // 3. Return the created bid
    const bid = await this.bidRepository.findOne({
      where: { id: result[0].bid_id },
      relations: ['user'],
    });

    console.log(`Bid placed via queue: $${amount} on auction ${auctionId} by user ${userId}`);

    return bid;
  }

  async getAuctionBids(auctionId: number): Promise<Bid[]> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId, isActive: true },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    return await this.bidRepository.find({
      where: { auctionId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveAuctionsWithTimeLeft(): Promise<ActiveAuctionWithTimeLeft[]> {
    const auctions = await this.auctionRepository.find({
      where: { isActive: true },
      relations: ['bids', 'bids.user'],
      order: { createdAt: 'DESC' },
    });

    return auctions.map(auction => {
      const highestBid = (auction.bids?.length || 0) > 0 
        ? auction.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max)
        : null;

      return {
        id: auction.id,
        name: auction.name,
        description: auction.description,
        startingPrice: auction.startingPrice,
        currentHighestBid: auction.currentHighestBid,
        timeLeft: auction.timeLeft,
        timeLeftFormatted: auction.timeLeftFormatted,
        isExpired: auction.isExpired,
        totalBids: (auction.bids?.length || 0),
        highestBidder: highestBid ? {
          id: highestBid.user.id,
          name: `${highestBid.user.firstName} ${highestBid.user.lastName}`,
          amount: highestBid.amount
        } : null,
        auctionEndTime: auction.auctionEndTime,
      };
    });
  }

  // Get auction results (completed auctions)
  async getAuctionResults(): Promise<AuctionResult[]> {
    const auctions = await this.auctionRepository.find({
      where: { isActive: false },
      relations: ['bids', 'bids.user'],
      order: { auctionEndTime: 'DESC' },
    });

    return auctions.map(auction => {
      const highestBid = (auction.bids?.length || 0) > 0 
        ? auction.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max)
        : null;

      return {
        id: auction.id,
        name: auction.name,
        description: auction.description,
        startingPrice: auction.startingPrice,
        finalPrice: highestBid ? highestBid.amount : auction.startingPrice,
        totalBids: (auction.bids?.length || 0),
        winner: highestBid ? {
          id: highestBid.user.id,
          name: `${highestBid.user.firstName} ${highestBid.user.lastName}`,
          email: highestBid.user.email,
          amount: highestBid.amount
        } : null,
        auctionEndTime: auction.auctionEndTime,
        status: highestBid ? 'Sold' : 'No Bids',
      };
    });
  }

  // Cleanup stale locks (run periodically)
  async cleanupStaleLocks(): Promise<number> {
    const result = await this.dataSource.query('SELECT cleanup_stale_locks() as deleted_count');
    return parseInt(result[0].deleted_count);
  }

  // Schedule auction expiration
  private scheduleAuctionExpiration(auctionId: number, endTime: Date) {
    const timeUntilExpiration = endTime.getTime() - Date.now();
    
    if (timeUntilExpiration > 0) {
      setTimeout(async () => {
        await this.handleAuctionExpiration(auctionId);
      }, timeUntilExpiration);
    }
  }

  // Handle auction expiration
  private async handleAuctionExpiration(auctionId: number) {
    try {
      const auction = await this.auctionRepository.findOne({
        where: { id: auctionId, isActive: true },
      });

      if (auction && !auction.isExpired) {
        // Mark auction as inactive
        await this.auctionRepository.update(auctionId, { isActive: false });
        
        console.log(`Auction ${auctionId} has expired`);
      }
    } catch (error) {
      console.error(`Error handling auction expiration for ${auctionId}:`, error);
    }
  }
} 