import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';

@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAuction(@Body() createAuctionDto: CreateAuctionDto) {
    return await this.auctionService.createAuction(createAuctionDto);
  }

  @Get()
  async getAllAuctions() {
    return await this.auctionService.getActiveAuctionsWithTimeLeft();
  }

  @Get(':id')
  async getAuctionById(@Param('id', ParseIntPipe) id: number) {
    return await this.auctionService.getAuctionById(id);
  }

  @Post(':id/bids')
  @HttpCode(HttpStatus.CREATED)
  async placeBid(@Param('id', ParseIntPipe) auctionId: number, @Body() placeBidDto: PlaceBidDto) {
    placeBidDto.auctionId = auctionId;
    return await this.auctionService.placeBid(placeBidDto);
  }

  @Get(':id/bids')
  async getAuctionBids(@Param('id', ParseIntPipe) id: number) {
    return await this.auctionService.getAuctionBids(id);
  }

  @Get('results/completed')
  async getAuctionResults() {
    return await this.auctionService.getAuctionResults();
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    const activeAuctions = await this.auctionService.getActiveAuctionsWithTimeLeft();
    const completedAuctions = await this.auctionService.getAuctionResults();
    
    const totalActiveAuctions = activeAuctions.length;
    const totalCompletedAuctions = completedAuctions.length;
    const totalBids = activeAuctions.reduce((sum, auction) => sum + auction.totalBids, 0);
    const totalValue = activeAuctions.reduce((sum, auction) => sum + auction.currentHighestBid, 0);
    
    return {
      activeAuctions: totalActiveAuctions,
      completedAuctions: totalCompletedAuctions,
      totalBids,
      totalValue: Math.round(totalValue * 100) / 100,
      recentAuctions: activeAuctions.slice(0, 5), // Show 5 most recent active auctions
    };
  }
} 