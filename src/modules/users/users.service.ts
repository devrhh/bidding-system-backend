import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
  }

  private async seedUsers() {
    const existingUsers = await this.userRepository.count();
    
    if (existingUsers === 0) {
      const users = [];
      
      for (let i = 1; i <= 100; i++) {
        users.push({
          username: `user${i}`,
          email: `user${i}@example.com`,
          firstName: `User${i}`,
          lastName: `Smith${i}`,
          isActive: true,
        });
      }

      await this.userRepository.save(users);
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }

  async getUserById(id: number): Promise<User> {
    return await this.userRepository.findOne({
      where: { id, isActive: true },
    });
  }
} 