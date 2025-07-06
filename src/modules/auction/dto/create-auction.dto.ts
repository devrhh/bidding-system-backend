import { IsString, IsNumber, IsDateString, Min, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAuctionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  startingPrice: number;

  @IsOptional()
  @IsDateString()
  auctionEndTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  durationMinutes?: number; // Duration in minutes from now
} 