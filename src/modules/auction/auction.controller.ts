import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
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
  async getAllAuctions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return await this.auctionService.getActiveAuctionsWithTimeLeft(Number(page), Number(limit));
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

} 