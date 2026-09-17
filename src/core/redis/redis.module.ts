import { RedisService } from './redis.service';
import { Global, Module, OnApplicationShutdown, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Global()
@Module({
  imports: [],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    try {
      await this.redisService.connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Redis connection error';
      throw new Error(`Redis connection failed during application startup: ${message}`);
    }
  }

  async onModuleDestroy() {
    await this.redisService.disconnect();
  }

  async onApplicationShutdown() {
    await this.redisService.disconnect();
  }
}
