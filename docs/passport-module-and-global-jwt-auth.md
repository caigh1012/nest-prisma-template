# PassportModule、JwtAuthStrategy 与 APP_GUARD 的注册关系

本文整理当前项目里关于以下几个问题的结论：

- `AppModule` 已经导入了 `PassportModule`，`LoginModule` 里是否还能删掉
- `JwtAuthStrategy` 和 `APP_GUARD` 的关系应该如何表达
- 如何让 `JwtAuthStrategy` 初始化失败时，在应用启动阶段直接报错

## 当前项目中的结论

### 1. `LoginModule` 里的 `PassportModule` 不能直接删除

当前代码中：

- [`../src/app.module.ts`](../src/app.module.ts) 导入了 `PassportModule`
- [`../src/modules/login/login.module.ts`](../src/modules/login/login.module.ts) 也导入了 `PassportModule`

这两处导入并不是重复无意义的导入。

原因是 Nest 的模块依赖不是“父模块导入后，子模块自动可用”。`AppModule` 中导入的模块，只对 `AppModule` 自己的 provider 生效，不会自动传递给 `LoginModule`。

所以当前项目里两处导入分别服务于不同职责：

- `AppModule` 中的 `PassportModule`
  - 服务于全局 JWT 鉴权这一套能力
  - 也就是 `JwtAuthStrategy`、`JwtAuthGuard`、`APP_GUARD`
- `LoginModule` 中的 `PassportModule`
  - 服务于登录模块自己的本地认证能力
  - 也就是 `LoginStrategy`、`LoginAuthGuard`

因此，在当前结构下，`LoginModule` 里的 `PassportModule` 应该保留。

## 2. 不能靠 `providers` 数组书写顺序表达依赖

下面这种写法虽然看起来像“先注册 strategy，再注册 guard”：

```ts
providers: [
  JwtAuthStrategy,
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
];
```

但实际上，`providers` 数组中的顺序并不能可靠表达“初始化先后依赖”。

更稳妥的方式是显式声明：`APP_GUARD` 的创建依赖 `JwtAuthStrategy`。

## 3. 推荐写法：让 `APP_GUARD` 通过工厂注入依赖

当前项目更适合下面这种方式：

```ts
providers: [
  JwtAuthStrategy,
  JwtAuthGuard,
  {
    provide: APP_GUARD,
    inject: [JwtAuthStrategy, JwtAuthGuard],
    useFactory: (jwtAuthStrategy: JwtAuthStrategy, jwtAuthGuard: JwtAuthGuard) => {
      if (!jwtAuthStrategy) {
        throw new Error('JwtAuthStrategy must be initialized before APP_GUARD');
      }

      return jwtAuthGuard;
    },
  },
];
```

它的好处有两点：

- 明确告诉 Nest：创建全局 guard 之前，先把 `JwtAuthStrategy` 和 `JwtAuthGuard` 解析好
- 如果 `JwtAuthStrategy` 无法成功注册，应用会在启动阶段直接报错，而不是拖到第一次请求进来才暴露问题

## 4. 这类报错通常会在启动阶段提前暴露

例如：

- `JwtAuthStrategy` 没有注册到 provider
- `ConfigService` 依赖无法注入
- `JWT_SECRET` 缺失导致策略初始化失败

在这种工厂注入方式下，Nest 会在解析 `APP_GUARD` 时就尝试解析 `JwtAuthStrategy`。如果解析失败，应用启动会直接失败，这比运行时再出现 `Unknown authentication strategy 'jwtAuth'` 更容易排查。

## 5. 如果后面想进一步优化结构

如果后续想把鉴权装配再整理得更干净，可以把这部分收成一个专门的全局模块，例如：

- `GlobalAuthModule`
- 在模块里统一 `imports: [PassportModule]`
- 统一 `providers: [JwtAuthStrategy, JwtAuthGuard, APP_GUARD]`
- 需要时通过 `@Global()` 暴露给整个应用

这样 `AppModule` 会更简洁，鉴权职责也会更集中。

不过在当前版本里，先保留现有结构也是完全合理的。
