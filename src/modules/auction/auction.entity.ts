import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Bid } from './bid.entity';

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  startingPrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  currentHighestBid: number;

  @Column({ type: 'timestamp' })
  auctionEndTime: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Bid, bid => bid.auction)
  bids: Bid[];

  // Computed property to check if auction has ended
  get isExpired(): boolean {
    return new Date() > this.auctionEndTime;
  }

  // Computed property to get time left in seconds
  get timeLeft(): number {
    const now = new Date();
    const endTime = new Date(this.auctionEndTime);
    return Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
  }

  // Computed property to get time left in a readable format
  get timeLeftFormatted(): string {
    const seconds = this.timeLeft;
    if (seconds <= 0) return 'Expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }
} 