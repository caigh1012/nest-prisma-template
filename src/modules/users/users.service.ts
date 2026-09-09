import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.t_user.create({
      data: {
        id: randomUUID(),
        ...createUserDto,
        password: hashedPassword,
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
