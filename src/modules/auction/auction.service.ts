import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Auction } from './auction.entity';
import { Bid } from './bid.entity';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { WebsocketGateway } from '../../common/websocket.gateway';
import { ActiveAuctionWithTimeLeft } from 'src/lib/types';
import { MAX_BID_AMOUNT } from '../../constants/auction';
@Injectable()
export class AuctionService {
  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
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

    // auctionEndTime must be in the future
    if (auctionEndTime.getTime() < Date.now()) {
      throw new BadRequestException('Auction end time must be in the future');
    }

    // auctionEndTime must not be more than 20 days in the future
    const MAX_AUCTION_DURATION_MS = 20 * 24 * 60 * 60 * 1000;
    if (auctionEndTime.getTime() - Date.now() > MAX_AUCTION_DURATION_MS) {
      throw new BadRequestException('Auction end time cannot be more than 20 days from now');
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

  async placeBid(placeBidDto: PlaceBidDto): Promise<Bid> {
    const { auctionId, userId, amount } = placeBidDto;

    if (amount > MAX_BID_AMOUNT) {
      throw new BadRequestException(`Bid amount must be less than ${MAX_BID_AMOUNT.toLocaleString()}`);
    }

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

  async getActiveAuctionsWithTimeLeft(page = 1, limit = 10): Promise<{ data: ActiveAuctionWithTimeLeft[]; total: number }> {
    const total = await this.auctionRepository.count({
      where: { isActive: true },
    });

    const auctions = await this.auctionRepository.find({
      where: { isActive: true },
      relations: ['bids', 'bids.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = auctions.map(auction => {
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
    return { data, total };
  }

  private scheduleAuctionExpiration(auctionId: number, endTime: Date) {
    const timeUntilExpiration = endTime.getTime() - Date.now();
    
    if (timeUntilExpiration > 0) {
      setTimeout(async () => {
        await this.handleAuctionExpiration(auctionId);
      }, timeUntilExpiration);
    }
  }

  private async handleAuctionExpiration(auctionId: number) {
    try {
      const auction = await this.auctionRepository.findOne({
        where: { id: auctionId, isActive: true },
      });

      if (auction && !auction.isExpired) {
        await this.auctionRepository.update(auctionId, { isActive: false });
      }
    } catch (error) {
      console.error(`Error handling auction expiration for ${auctionId}:`, error);
    }
  }
} 