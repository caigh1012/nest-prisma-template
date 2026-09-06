import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const user = await this.prisma.t_user.create({
      data: {
        id: randomUUID(),
        ...createUserDto,
      },
    });
    return plainToInstance(UserEntity, user);
  }

  async findAll() {
    const users = await this.prisma.t_user.findMany();

    return plainToInstance(UserEntity, users);
  }

  async findOne(username: string) {
    const user = await this.prisma.t_user.findUnique({ where: { username } });
    return user;
  }
}
