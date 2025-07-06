import { Controller, Get, Post, Param, ParseIntPipe, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers() {
    return await this.usersService.getAllUsers();
  }

  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.getUserById(id);
  }
/// For testing purposes
  @Get('random/user')
  async getRandomUser() {
    return await this.usersService.getRandomUser();
  }

  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  async seedUsers(@Body() body: { count: number }) {
    return await this.usersService.seedUsers(body.count);
  }

  ////

} 