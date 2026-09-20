import { Body, Controller, Get, Inject, Post, UseInterceptors } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { Role } from '@/config/role.enum';
import { Roles } from '../shared/decorators/roles.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Controller('user')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    // 由 CacheModule.registerAsync 全局注入的 cache-manager 实例
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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

  /**
   * Demo A：手动 cacheManager.get/set
   * —— 完全控制读写流程，可以附加额外字段（如 source），
   *    适合需要自定义缓存语义、跳过某些请求、或在写入前加工数据的场景。
   */
  @Get('info')
  async findMe() {
    // 缓存键与 TTL（毫秒）。这里和 @CacheKey/@CacheTTL 装饰器等价，
    // 但更直观：直接走 cache-manager，不依赖 CacheInterceptor。
    const cacheKey = 'USER_LIST';
    const cacheTtl = 60 * 1000;

    try {
      // 1. 先读缓存：命中则直接返回，附带 source 便于观察效果
      const cached = await this.cacheManager.get<{
        message: string;
        timestamp: number;
      }>(cacheKey);
      if (cached) {
        return {
          ...cached,
          source: 'cache',
        };
      }

      // 2. 未命中：模拟从数据源获取数据
      const data = {
        message: 'User info fetched from origin',
        timestamp: Date.now(),
      };

      // 3. 写回缓存，TTL 60s 过期
      await this.cacheManager.set(cacheKey, data, cacheTtl);

      return {
        ...data,
        source: 'origin',
      };
    } catch (error) {
      return {
        message: 'Cache demo failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Demo B：声明式 CacheInterceptor + CacheKey + CacheTTL
   * —— 适合“接口结果整段缓存”的场景，零业务代码改动。
   *
   * 行为说明：
   * - @UseInterceptors(CacheInterceptor) 默认只缓存 GET 请求，
   *   命中后直接返回缓存内容；未命中则执行方法并把返回值写入缓存。
   * - @CacheKey 自定义缓存键（默认使用请求 URL，建议显式声明以便全局稳定）。
   * - @CacheTTL 单位为毫秒（@nestjs/cache-manager v3+ / cache-manager v5+）。
   *   未声明时使用 CacheModule.registerAsync 中配置的默认 ttl。
   */
  @Get('interceptor-demo')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('USER_INTERCEPTOR_DEMO')
  @CacheTTL(60 * 1000)
  interceptorDemo() {
    return {
      message: 'User info via CacheInterceptor',
      timestamp: Date.now(),
    };
  }
}
