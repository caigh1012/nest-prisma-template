## 项目环境配置

使用 @nestjs/config 加载项目环境变量，并通过 ConfigService 获取配置值

## csrf 攻击防御

由于项目中使用的是 jwt 认证，所以不需要配置 csrf 攻击防御措施。

1. 项目中不需要使用到 cookie-parser、 @types/cookie-parser 以及 express-session、@types/express-session
2. 由于项目中没有使用到 cookie，所以项目中不需要使用到 csrf-csrf、@types/csrf-csrf 等 npm 库

## 模板引擎（hbs）

项目为纯后端 ，所以不需要使用到引擎。如果需要就需要安装 hbs 库并配置模板引擎

## helmet

当前项目主要是作为纯后端服务，所以不需要使用到 helmet 库。

一般来说，cookie、session、csrf、helmet 等一起配合使用，以提高应用的安全性。

## 请求日志

使用 nestjs-pino pino-http pino pino-roll 配置请求日志记录

## @nestjs/axios axios (HttpModule)

HttpModule 用于发送 HTTP 请求，请求外部应用数据

## middlewares 中间件

在控制器执行前/后运行，处理 HTTP 层逻辑（如日志、CORS）

## 异常过滤器

在方法执行后运行，处理异常（如验证失败、数据库错误）并返回统一响应。

## pipes 管道

管道有两种典型用途：

转换：将输入数据转换为所需格式（例如，从字符串转换为整数）
验证：评估输入数据，如果有效，则直接传递，否则抛出异常。

配合 class-validator class-transformer 实现参数验证和转换

## interceptors 拦截器

在方法执行前后运行，可修改响应、抛出异常、缓存等；

## guards 授权和验证（守卫实现）

详细见 [passport-module-and-global-jwt-auth.md](./passport-module-and-global-jwt-auth.md)

## @nestjs/event-emitter 事件总线

事件总线：统一使用 user.created 这类命名，支持后续 user.* 通配监听

```typescript
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
```

## redis连接和缓存配置

```typescript
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
          // 显式声明：连接失败时让 @keyv/redis 抛错并冒泡到外层 Keyv（@keyv/redis 中默认为 true；
          // createKeyv 在该值为 true 时会把外层 keyv.throwOnErrors 同步置为 true）
          throwOnConnectError: true,
          // 统一前缀，便于在 Redis 中区分业务缓存
          // namespace: 'nest-prisma-template',
          keyPrefixSeparator: ':',
          // 连接超时：避免启动期长时间阻塞（KeyvRedisOptions 字段名为 connectionTimeout）
          connectionTimeout: 10000,
        });

        return {
          namespace: CACHE_NAMESPACE,
          stores: [keyv],
          // 全局默认 TTL，未使用 @CacheTTL 装饰器时生效， 默认 TTL 单位：毫秒
          // ttl: 60 * 1000,

          // 单 key 最大条目数（cache-manager v5+），主要对本地内存 store 有意义；
          // Redis store 通常作为 0 = 不限制。
          max: 0,
        };
      },
    }),
```
