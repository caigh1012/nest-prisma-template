import { CoreModule } from './core/core.module';
import { UploadModule } from './modules/upload/upload.module';
import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { createKeyv } from '@keyv/redis';
import { PassportModule } from '@nestjs/passport';
import { LoggerModule } from 'nestjs-pino';
import { LoginModule } from './modules/login/login.module';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { JwtAuthStrategy } from './core/guards/strategy/jwt-auth.strategy';
import { UsersModule } from './modules/users/users.module';
import { RolesGuard } from './core/guards/roles.guard';
import { parsePort } from './utils/parse-port';
import { loggerMiddleware } from '@/core/middlewares/logger.middleware';
import { ValidationPipe } from '@/core/pipes/validation.pipe';
import { HttpExceptionFilter } from '@/core/filters/http-exception.filter';
import { CACHE_NAMESPACE } from './config/constants';

const providers = [
  JwtAuthStrategy,
  // 对于同一个模块里注册的多个 APP_GUARD，执行顺序就是注册顺序。
  // 先验证 JWT，再验证角色权限
  // 所以，如果 JWT 验证失败，会直接返回 401 错误；如果角色权限失败，会继续执行下一个 APP_GUARD。
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
  // 验证角色权限
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
  // 全局响应序列化拦截器（配合 class-transformer 的 @Exclude/@Expose 使用）
  {
    provide: APP_INTERCEPTOR,
    useClass: ClassSerializerInterceptor,
  },
  // 全局参数校验管道（class-validator + class-transformer）
  {
    provide: APP_PIPE,
    useClass: ValidationPipe,
  },
  // 全局异常过滤器（统一错误响应结构）
  {
    provide: APP_FILTER,
    useClass: HttpExceptionFilter,
  },
];

/**
 * 根模块
 */
@Module({
  imports: [
    // 引入 env 文件配置
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('CacheModule');

        // Redis 连接基础配置
        const redisHost = configService.get<string>('REDIS_HOST') ?? '192.168.1.203';
        const redisPort = parsePort(configService.get<string>('REDIS_PORT'), 'REDIS_PORT') ?? 6379;

        // 构造 redis://[username:password@]host:port/db
        const redisUrl = `redis://${redisHost}:${redisPort}`;

        logger.log(`CacheModule redis config: ${redisUrl}`);

        const keyv = createKeyv(redisUrl, {
          // 统一前缀，便于在 Redis 中区分业务缓存
          namespace: CACHE_NAMESPACE,

          // 显式声明：连接失败时让 @keyv/redis 抛错并冒泡到外层 Keyv（@keyv/redis 中默认为 true；
          // createKeyv 在该值为 true 时会把外层 keyv.throwOnErrors 同步置为 true）
          throwOnConnectError: true,

          throwOnErrors: true,

          keyPrefixSeparator: ':',
          // 连接超时：避免启动期长时间阻塞（KeyvRedisOptions 字段名为 connectionTimeout）
          connectionTimeout: 10000,
        });

        return {
          stores: [keyv],
          // 全局默认 TTL，未使用 @CacheTTL 装饰器时生效， 默认 TTL 单位：毫秒
          // ttl: 60 * 1000,

          // 单 key 最大条目数（cache-manager v5+），主要对本地内存 store 有意义；
          // Redis store 通常作为 0 = 不限制。
          max: 0,
        };
      },
    }),

    // 事件总线：统一使用 user.created 这类命名，支持后续 user.* 通配监听
    EventEmitterModule.forRoot({
      wildcard: true, // 开启通配符事件匹配，如 user.*
      delimiter: '.', // 事件命名分隔符，对应 user.created 这种风格
      newListener: false, // 不额外发布“新增监听器”事件
      removeListener: false, // 不额外发布“移除监听器”事件
      maxListeners: 20, // 允许更多监听器，减少业务模块增多后的告警
      verboseMemoryLeak: true, // 超过监听器上限时输出更明确的泄漏提示
      ignoreErrors: false, // 监听器抛错时继续向外抛出，避免静默失败
    }),

    // pino 日志：仅生产环境按天滚动（文件名带日期），单个文件超过 10MB 自动创建新文件
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // 兼容 Nest 11 / Express 5 的命名通配符语法，避免全局前缀拼接成 /api/*
        forRoutes: ['{*path}'],
        pinoHttp:
          configService.get('NODE_ENV') === 'production'
            ? {
                transport: {
                  target: 'pino-roll',
                  options: {
                    file: './logs/app', // 生成 ./logs/app.YYYY-MM-DD.N.log
                    frequency: 'daily', // 每天滚动
                    dateFormat: 'yyyy-MM-dd', // 文件名带上日期（pino-roll 4.x 需显式指定）
                    size: '10m', // 超过 10MB 滚动
                    mkdir: true, // 自动创建 ./logs 目录
                  },
                },
              }
            : {
                transport: {
                  target: 'pino-pretty',
                  options: { singleLine: true },
                },
              },
      }),
    }),

    // 业务模块
    PassportModule,
    CoreModule,
    LoginModule,
    UsersModule,
    UploadModule,
  ],
  providers: providers,
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 全局日志 仅记录 /api 下的请求；Express 会自动匹配 /api 及其子路径
    consumer.apply(loggerMiddleware).forRoutes('/api');
  }
}
