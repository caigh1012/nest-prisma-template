import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserDto: CreateUserDto) {
    return this.prisma.t_user.create({
      data: {
        id: randomUUID(),
        ...createUserDto,
      },
    });
  }

  findAll() {
    return this.prisma.t_user.findMany();
  }
}
