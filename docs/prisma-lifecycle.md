# Prisma 生命周期处理说明

## 背景

当前项目在 `PrismaService` 中通过 `PrismaPg` 和 `DATABASE_URL` 初始化了 Prisma Client：

```ts
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
```

这一步只是完成 Prisma Client 和数据库适配器配置，本身不会在构造阶段立即建立数据库连接。

Prisma 默认是懒连接模式，通常在第一次执行数据库查询时才真正连接数据库。
