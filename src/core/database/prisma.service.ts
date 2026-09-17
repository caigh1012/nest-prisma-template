import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(private readonly configService: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: configService.getOrThrow<string>('DATABASE_URL'),
        // 连接池允许同时存在的最大连接数。
        max: Number(configService.get<string>('DATABASE_POOL_MAX') ?? '10'),
        // 连接池保留的最小连接数；不会在启动时预先创建连接。
        min: Number(configService.get<string>('DATABASE_POOL_MIN') ?? '0'),
        // 空闲连接超过该时长后可被释放，单位为毫秒。
        idleTimeoutMillis: Number(configService.get<string>('DATABASE_POOL_IDLE_TIMEOUT_MS') ?? '10000'),
        // 获取或建立连接的最长等待时间，单位为毫秒。
        connectionTimeoutMillis: Number(configService.get<string>('DATABASE_POOL_CONNECTION_TIMEOUT_MS') ?? '10000'),
      }),
    });
  }
}
