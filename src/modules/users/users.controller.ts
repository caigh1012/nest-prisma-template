import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { Role } from '@/config/role.enum';
import { Roles } from '@/core/decorators/roles.decorator';
import { RedisService } from '@/core/redis/redis.service';

@Controller('user')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('list')
  @Roles(Role.Admin)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('info')
  async findMe() {
    try {
      await this.redisService.getClient().set('user', 'admin');
      return {
        message: 'Redis set success',
      };
    } catch (error) {
      return {
        message: 'Redis set failed',
        error: error.message,
      };
    }
  }
}
