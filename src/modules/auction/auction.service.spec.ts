/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { AuctionService } from './auction.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auction } from './auction.entity';
import { Bid } from './bid.entity';
import { User } from '../users/users.entity';
import { Repository } from 'typeorm';
import { WebsocketGateway } from '../../common/websocket.gateway';
import { DataSource } from 'typeorm';

describe('AuctionService', () => {
  let service: AuctionService;
  let auctionRepository: Repository<Auction>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionService,
        WebsocketGateway,
        {
          provide: getRepositoryToken(Auction),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Bid),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AuctionService>(AuctionService);
    auctionRepository = module.get<Repository<Auction>>(getRepositoryToken(Auction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuctionById', () => {
    it('should return an auction by id', async () => {
      const mockAuction = { id: 1, name: 'Auction 1', isActive: true, bids: [], createdAt: new Date() } as Auction;
      jest.spyOn(auctionRepository, 'findOne').mockResolvedValue(mockAuction);
      const result = await service.getAuctionById(1);
      expect(result).toEqual(mockAuction);
      expect(auctionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
        relations: ['bids', 'bids.user'],
      });
    });
  });

  describe('placeBid', () => {
    it('should place a valid bid', async () => {
      const mockAuction = {
        id: 1,
        isActive: true,
        isExpired: false,
        startingPrice: 100,
        currentHighestBid: 150,
        bids: [],
        timeLeft: 60,
        timeLeftFormatted: '1m',
        name: 'Auction 1',
      };
      const mockBid = { id: 1, auctionId: 1, userId: 2, amount: 200, user: { firstName: 'John' } };
      const placeBidDto = { auctionId: 1, userId: 2, amount: 200 };
      const manager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(mockAuction) // for auction fetch
          .mockResolvedValueOnce(mockBid),    // for bid fetch
        create: jest.fn((EntityClass, obj) => obj),
        save: jest.fn().mockResolvedValue(mockBid),
        update: jest.fn().mockResolvedValue(undefined),
        count: jest.fn().mockResolvedValue(1),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: function () { return this; },
          set: function () { return this; },
          where: function () { return this; },
          execute: async () => ({ affected: 1 }),
        }),
      };
      const dataSource = {
        transaction: (cb: any) => cb(manager),
      };
      service['dataSource'] = dataSource as any;
      service['websocketGateway'] = { emitBidUpdate: jest.fn(), emitAuctionUpdate: jest.fn() } as any;
      jest.spyOn(manager, 'findOne');
      jest.spyOn(manager, 'create');
      jest.spyOn(manager, 'save');
      jest.spyOn(manager, 'update');
      jest.spyOn(manager, 'count');
      const result = await service.placeBid(placeBidDto);
      expect(result).toEqual(expect.objectContaining({ auctionId: 1, userId: 2, amount: 200 }));
      expect(manager.findOne).toHaveBeenCalled();
      expect(manager.create).toHaveBeenCalled();
      const createCallArgs = manager.create.mock.calls[0];
      expect(createCallArgs[1]).toMatchObject({ auctionId: 1, userId: 2, amount: 200 });
      expect(manager.save).toHaveBeenCalled();
      expect(manager.count).toHaveBeenCalledWith(Bid, { where: { auctionId: 1 } });
    });

    it('should throw if bid is too low', async () => {
      const mockAuction = {
        id: 1,
        isActive: true,
        isExpired: false,
        startingPrice: 100,
        currentHighestBid: 150,
        bids: [],
      };
      const placeBidDto = { auctionId: 1, userId: 2, amount: 120 };
      const manager = {
        findOne: jest.fn().mockResolvedValue(mockAuction),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: function () { return this; },
          set: function () { return this; },
          where: function () { return this; },
          execute: async () => ({ affected: 0 }),
        }),
      };
      const dataSource = {
        transaction: (cb: any) => cb(manager),
      };
      service['dataSource'] = dataSource as any;
      await expect(service.placeBid(placeBidDto)).rejects.toThrow('Bid must be higher than current highest value ($150)');
    });
  });

  describe('createAuction', () => {
    it('should create an auction and emit new auction notification', async () => {
      const createAuctionDto = {
        name: 'Test Auction',
        description: 'Test Description',
        startingPrice: 100,
        durationMinutes: 60,
      };
      
      const mockAuction = {
        id: 1,
        name: 'Test Auction',
        description: 'Test Description',
        startingPrice: 100,
        auctionEndTime: new Date(Date.now() + 60 * 60 * 1000),
        timeLeft: 3600,
        timeLeftFormatted: '1h 0m 0s',
      };
      
      jest.spyOn(auctionRepository, 'create').mockReturnValue(mockAuction as any);
      jest.spyOn(auctionRepository, 'save').mockResolvedValue(mockAuction as any);
      service['websocketGateway'] = { emitNewAuction: jest.fn() } as any;
      jest.spyOn(service as any, 'scheduleAuctionExpiration').mockImplementation(() => {});
      
      const result = await service.createAuction(createAuctionDto);
      
      expect(result).toEqual(mockAuction);
      expect(auctionRepository.create).toHaveBeenCalledWith({
        name: 'Test Auction',
        description: 'Test Description',
        startingPrice: 100,
        auctionEndTime: expect.any(Date),
      });
      expect(auctionRepository.save).toHaveBeenCalled();
      expect(service['websocketGateway'].emitNewAuction).toHaveBeenCalledWith({
        auctionId: 1,
        name: 'Test Auction',
        description: 'Test Description',
        startingPrice: 100,
        auctionEndTime: mockAuction.auctionEndTime,
        timeLeft: 3600,
        timeLeftFormatted: '1h 0m 0s',
      });
    });
  });
}); 