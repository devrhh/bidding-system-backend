import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'bidding-system-backend',
      version: '1.0.0',
    };
  }

  @Get()
  getInfo() {
    return {
      name: 'Real-Time Bidding System API',
      version: '1.0.0',
      description: 'A real-time bidding system built with NestJS',
      endpoints: {
        health: '/health',
        auctions: '/auctions',
        users: '/users',
      },
    };
  }
} 