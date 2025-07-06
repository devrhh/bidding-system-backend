import { IsNumber, Min, IsNotEmpty } from 'class-validator';

export class PlaceBidDto {
  @IsNumber()
  @IsNotEmpty()
  auctionId: number;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @Min(0)
  amount: number;
} 