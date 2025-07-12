import { DataSource } from 'typeorm';
import { Auction } from './modules/auction/auction.entity';
import { Bid } from './modules/auction/bid.entity';
import { User } from './modules/users/users.entity';
import { APP_CONFIG, DB_CONFIG } from './lib/config';

export const AppDataSource = new DataSource({
  ...DB_CONFIG,
  type: 'postgres',
  entities: [Auction, Bid, User],
  synchronize: APP_CONFIG.nodeEnv !== 'production',
  logging: APP_CONFIG.nodeEnv !== 'production',
}); 
