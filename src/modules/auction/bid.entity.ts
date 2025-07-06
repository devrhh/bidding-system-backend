import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, Unique, Check } from 'typeorm';
import { Auction } from './auction.entity';
import { User } from '../users/users.entity';

@Entity('bids')
@Unique(['auctionId', 'userId', 'amount'])
@Check('amount > 0')
export class Bid {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  auctionId: number;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Auction, auction => auction.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auctionId' })
  auction: Auction;

  @ManyToOne(() => User, user => user.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
} 