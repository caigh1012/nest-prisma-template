import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { type RedisOptions } from 'ioredis';
import { parsePort } from 'src/utils/parse-port';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = this.createClient();
    this.registerListeners();
  }

  /**
   * 建立 Redis 单机连接。
   */
  async connect() {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  /**
   * 获取底层 Redis 客户端实例，便于业务侧按需使用原生命令。
   */
  getClient() {
    return this.client;
  }

  /**
   * 用于快速检查当前 Redis 连接是否可用。
   */
  async ping() {
    return this.client.ping();
  }

  private createClient() {
    const options: RedisOptions = {
      host: this.configService.get<string>('REDIS_HOST') ?? '192.168.1.203',
      port: parsePort(this.configService.get<string>('REDIS_PORT'), 'REDIS_PORT') ?? 6379,
      connectTimeout: 30 * 1000,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    };

    return new Redis(options);
  }

  private registerListeners() {
    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis ready');
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`, error.stack);
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  /**
   * 关闭 Redis 连接。
   */
  async disconnect() {
    if (this.client.status === 'end') {
      return;
    }

    await this.client.quit();
  }
}
