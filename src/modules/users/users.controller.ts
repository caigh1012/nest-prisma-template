import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { Role } from '@/config/role.enum';
import { Roles } from '@/core/decorators/roles.decorator';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('list')
  @Roles(Role.Admin)
  findAll() {
    return this.usersService.findAll();
  }
}
