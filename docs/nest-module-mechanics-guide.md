# NestJS 模块机制使用说明

本文整理 NestJS 模块相关的核心机制，围绕以下问题展开：

- `@Module()` 默认是单例吗？`providers` 中的 Provider 也是单例吗？
- `exports` 能否导出不在 `providers` 中的 `xxxService`？
- `imports` 中只能导入 `xxxModule` 吗？
- `exports: [xxxModule]` 是导出 `xxxModule` 的 `exports` 吗？中间模块能否使用底层 Provider？
- 什么是 `@Global()`？还需要 `imports` 吗？
- 子模块导入全局模块后，其他模块还需要重复导入吗？
- `imports` 数组顺序会影响初始化与注入吗？
- 上下级 `imports` 的依赖可见性是如何传递的？
- 动态模块（`register` / `forRoot` / `forFeature`）是异步的吗？Provider 依赖 `ConfigService` 怎么办？

---

## 1. `@Module()` 与 `providers` 是否单例

### 1.1 Module 默认单例

`@Module()` 只是元数据装饰器。Nest 启动时实例化模块类，默认在整个应用容器中复用同一个静态模块实例。

多个模块都 `imports: [UsersModule]` 时，通常不会分别创建多个 `UsersModule` 实例。

但需要注意的是：

- 如果使用**动态模块**且使用不同配置多次注册，可能形成不同的模块上下文。
- `NestFactory.createApplicationContext()` 创建的独立应用上下文拥有自己的模块容器。

### 1.2 Provider 默认单例

```typescript
@Injectable()
export class UsersService {}
```

等价于：

```typescript
@Injectable({ scope: Scope.DEFAULT })
export class UsersService {}
```

`providers` 中的 Provider 默认使用 `Scope.DEFAULT`，即单例作用域。在应用生命周期内通常只有一个 `UsersService` 实例。

Provider 还支持其他作用域：

- `Scope.DEFAULT`：默认单例。
- `Scope.REQUEST`：每个请求创建一个实例。
- `Scope.TRANSIENT`：每次注入都获得一个新实例。

例如：

```typescript
@Injectable({ scope: Scope.REQUEST })
export class UsersService {}
```

此时 `UsersService` 不再是默认单例。

### 1.3 一句话总结

> Module 默认单例；Provider 默认单例，但可通过 `scope` 改为 `REQUEST` 或 `TRANSIENT`。

---

## 2. `exports` 能否导出不在 `providers` 中的 `xxxService`

通常不能这样写：

```typescript
@Module({
  providers: [],
  exports: [UsersService],
})
export class UsersModule {}
```

原因是 `exports` 不负责创建或注册 Provider，它只决定：

> 当前模块已经拥有的哪些能力，可以暴露给其他模块使用。

Nest 必须先知道 `UsersService` 从哪里来，一般需要先注册到 `providers`：

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

各字段的作用：

- `providers: [UsersService]`：将 `UsersService` 注册到当前模块的 DI 容器。
- `exports: [UsersService]`：允许导入 `UsersModule` 的其他模块注入该实例。

其他模块才能这样使用：

```typescript
@Module({
  imports: [UsersModule],
  providers: [OrdersService],
})
export class OrdersModule {}
```

然后在 `OrdersService` 中注入：

```typescript
@Injectable()
export class OrdersService {
  constructor(private readonly usersService: UsersService) {}
}
```

### 2.1 原因

Nest 的模块具有封装边界。Provider 默认只在声明它的模块内部可见。如果 `UsersService` 既不在 `providers` 中，也不是通过某个导入模块提供的，那么：

- 当前模块不拥有这个 Provider。
- Nest 不知道如何创建它。
- 当前模块也就没有实例可以导出。
- Nest 通常会在启动时报告无法导出不属于当前模块的 Provider。

### 2.2 重新导出模块

如果 Provider 来自另一个模块，推荐重新导出那个模块，而不是在当前模块重复注册 Service：

```typescript
@Module({
  imports: [UsersModule],
  exports: [UsersModule],
})
export class SharedModule {}
```

不要这样重复声明：

```typescript
@Module({
  imports: [UsersModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class SharedModule {}
```

把 `UsersService` 再次放进 `providers`，意味着它属于另一个模块上下文，可能产生另一个实例，并且它依赖的 Provider 也需要在该模块中可见。

### 2.3 一句话总结

> `providers` 决定“当前模块拥有什么”，`exports` 决定“当前模块愿意把什么提供给其他模块”，`imports` 决定“当前模块可以使用其他模块导出的什么”。

---

## 3. `imports` 只能导入 `xxxModule` 吗

是的，`@Module()` 的 `imports` 中应该放模块，不能直接放 `xxxService`。

```typescript
@Module({
  imports: [UsersModule],
})
export class OrdersModule {}
```

不能这样写：

```typescript
@Module({
  imports: [UsersService],
})
export class OrdersModule {}
```

原因是三者职责不同：

- `imports`：导入其他模块暴露的依赖。
- `providers`：在当前模块注册 Service、Repository、Factory 等 Provider。
- `exports`：把当前模块拥有的 Provider 或导入的模块暴露出去。

如果 `OrdersModule` 想使用 `UsersService`，应让 `UsersModule` 注册并导出它：

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

然后导入 `UsersModule`：

```typescript
@Module({
  imports: [UsersModule],
  providers: [OrdersService],
})
export class OrdersModule {}
```

这样就能在 `OrdersService` 中注入：

```typescript
@Injectable()
export class OrdersService {
  constructor(private readonly usersService: UsersService) {}
}
```

### 3.1 `imports` 接受的主要类型

- 普通模块：`UsersModule`
- 动态模块：`ConfigModule.forRoot()`
- Promise 动态模块
- `forwardRef(() => UsersModule)`：用于处理模块循环依赖

### 3.2 为什么不直接放在 `providers`

如果把 `UsersService` 写到 `OrdersModule` 的 `providers` 中：

```typescript
@Module({
  providers: [UsersService],
})
export class OrdersModule {}
```

虽然可能使用，但它表示在当前模块**重新注册**这个 Provider：

- 可能产生独立实例。
- `UsersService` 所依赖的 Provider 也必须在 `OrdersModule` 中可见。
- 不推荐用这种方式跨模块共享 Service。

### 3.3 一句话总结

> `imports` 导入模块，模块通过 `exports` 对外提供 Service；Service 本身放在 `providers` 中，而不是 `imports` 中。

---

## 4. `exports: [UsersModule]` 的含义

```typescript
@Module({
  imports: [UsersModule],
  exports: [UsersModule],
})
export class SharedModule {}
```

`exports: [UsersModule]` 表示**重新导出 `UsersModule` 对外导出的内容**，并不是把 `UsersModule` 类本身作为普通 Provider 导出。

假设：

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

那么 `SharedModule` 重新导出 `UsersModule` 后，相当于把 `UsersService` 的使用能力继续向下传递：

```text
UsersModule
  导出 UsersService
        ↓
SharedModule
  导入并重新导出 UsersModule
        ↓
其他模块导入 SharedModule
  可以注入 UsersService
```

### 4.1 `SharedModule` 内能否使用 `UsersService`

可以。因为 `SharedModule` 已经 `imports: [UsersModule]`，所以在 `SharedModule` 中注册的 Provider 可以注入 `UsersModule` 导出的 `UsersService`：

```typescript
@Injectable()
export class SharedService {
  constructor(private readonly usersService: UsersService) {}
}

@Module({
  imports: [UsersModule],
  providers: [SharedService],
  exports: [UsersModule],
})
export class SharedModule {}
```

### 4.2 区分两个作用

- `imports: [UsersModule]`：让 `SharedModule` 内部可以使用 `UsersService`。
- `exports: [UsersModule]`：让导入 `SharedModule` 的下游模块也可以使用 `UsersService`。

如果 `SharedModule` 只有导入而没有重新导出：

```typescript
@Module({
  imports: [UsersModule],
})
export class SharedModule {}
```

结果是：

- `SharedModule` 内部可以使用 `UsersService`。
- 导入 `SharedModule` 的 `OrdersModule` 不能因此使用 `UsersService`。

### 4.3 一句话总结

> `imports: [xxxModule]` 让当前模块使用 `xxxModule` 的导出；`exports: [xxxModule]` 则把 `xxxModule` 的导出继续提供给下游模块。

---

## 5. `@Global()` 全局模块

`@Global()` 表示把该模块声明为**全局模块**。以 [prisma.module.ts](../src/core/database/prisma.module.ts) 为例：

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

效果是：只要 `PrismaModule` 在整个应用中被导入一次，它导出的 `PrismaService` 就可以被其他模块直接注入，而不需要每个模块都重复导入 `PrismaModule`。

### 5.1 使用方式

通常在根模块中导入一次：

```typescript
@Module({
  imports: [PrismaModule, UsersModule, OrdersModule],
})
export class AppModule {}
```

之后 `UsersModule` 不需要再导入 `PrismaModule`：

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

直接注入：

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
}
```

### 5.2 注意事项

- `@Global()` **不等于完全不用导入**，仍然需要在应用中导入至少一次，通常放在 `AppModule` 或 `CoreModule`。
- 只有全局模块 `exports` 中的 Provider 才会全局可用。这里是 `PrismaService`。
- `providers` 中注册但没有 `exports` 的 Provider，即使模块标记为 `@Global()`，其他模块通常也不能使用。
- 不要在多个模块中重复导入或重新注册 `PrismaService`，否则可能形成额外的模块上下文或实例。
- 全局模块适合 Prisma、配置、日志、缓存等基础设施，但不宜滥用，否则模块依赖关系会变得隐式。

### 5.3 一句话总结

> `@Global()` 的含义是“该模块导出的 Provider 在全应用可见”，但该全局模块本身仍需要在应用中被导入一次。

---

## 6. 特性子模块导入全局模块的可见性

只要带有 `@Global()` 的模块被应用模块依赖图中的任意模块导入一次，其他模块就不需要重复导入。

例如：

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

即使只在特性子模块中导入：

```typescript
@Module({
  imports: [PrismaModule],
})
export class UsersModule {}
```

而根模块导入了该特性模块：

```typescript
@Module({
  imports: [UsersModule, OrdersModule],
})
export class AppModule {}
```

那么 `OrdersModule` 虽然没有导入 `PrismaModule`，其 Provider 仍然可以注入 `PrismaService`：

```typescript
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}
}
```

前提条件：

- `UsersModule` 确实位于当前应用的模块依赖图中，例如被 `AppModule` 直接或间接导入。
- `UsersModule` 导入了 `PrismaModule`。
- `PrismaModule` 使用了 `@Global()`。
- `PrismaModule` 在 `exports` 中导出了 `PrismaService`。
- `OrdersModule` 和 `UsersModule` 属于同一个 Nest 应用上下文。

### 6.1 仍推荐根模块导入

虽然在特性子模块导入技术上可行，但更推荐在根模块或专门的核心模块中导入：

```typescript
@Module({
  imports: [PrismaModule, UsersModule, OrdersModule],
})
export class AppModule {}
```

原因：

- 明确表示它是整个应用共享的依赖。
- 不会让应用是否能获得 `PrismaService` 隐式依赖于某个特性模块。
- 将来移除 `UsersModule` 时，不会意外导致其他模块失去 `PrismaService`。
- 测试模块时更容易明确需要导入哪些全局依赖。

### 6.2 特别注意

`@Global()` 的作用范围是一个 Nest 应用容器，不是 Node.js 进程中的绝对全局。独立创建的测试模块、微服务应用或 `NestFactory.createApplicationContext()` 通常都有各自的 DI 上下文，需要分别导入一次。

### 6.3 一句话总结

> 可以在任意特性子模块中首次导入全局模块，之后同一应用上下文中的其他模块都无需重复导入；但工程实践上通常建议在根模块或核心模块中集中导入。

---

## 7. `imports` 数组顺序与执行顺序

通常**不会有依赖注入上的先后问题**。

```typescript
imports: [UsersModule, OrdersModule];
```

改成：

```typescript
imports: [OrdersModule, UsersModule];
```

Nest 会先扫描完整的模块依赖图，再创建和解析 Provider。它不是简单地按照数组顺序执行完 `UsersModule`，然后才处理 `OrdersModule`。

因此，如果 `UsersModule` 导入了全局的 `PrismaModule`：

```typescript
@Module({
  imports: [PrismaModule],
})
export class UsersModule {}
```

即使 `AppModule` 写成：

```typescript
@Module({
  imports: [OrdersModule, UsersModule],
})
export class AppModule {}
```

`OrdersModule` 中通常仍然可以注入 `PrismaService`。

### 7.1 不要依赖数组顺序解决模块依赖

如果 `OrdersService` 明确依赖 `UsersService`，应显式声明模块依赖：

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

@Module({
  imports: [UsersModule],
  providers: [OrdersService],
})
export class OrdersModule {}
```

而不是认为下面的顺序会让 `OrdersModule` 自动获得 `UsersService`：

```typescript
@Module({
  imports: [UsersModule, OrdersModule],
})
export class AppModule {}
```

两个模块同时被 `AppModule` 导入，只表示它们都是 `AppModule` 的依赖，并不会让它们彼此可见。数组顺序也不会建立这种依赖关系。

### 7.2 生命周期钩子需要注意

虽然 DI 不应依赖 `imports` 数组顺序，但以下钩子的调用确实存在初始化阶段：

- `onModuleInit()`
- `onApplicationBootstrap()`
- `onModuleDestroy()`
- `beforeApplicationShutdown()`

不要通过调整 `imports` 数组顺序来保证业务初始化顺序。如果 `OrdersModule` 必须等待某项初始化完成，应使用明确机制，例如：

- 在依赖服务的方法内部等待初始化 Promise。
- 在 `onApplicationBootstrap()` 中集中编排。
- 通过显式模块依赖表达关系。
- 对数据库、Redis 等依赖提供明确的就绪状态或连接方法。

### 7.3 针对 Prisma 模块

建议在 `AppModule` 中直接导入全局 `PrismaModule`：

```typescript
@Module({
  imports: [PrismaModule, UsersModule, OrdersModule],
})
export class AppModule {}
```

把 `PrismaModule` 放在前面主要是为了**代码可读性**，不是依靠它保证 DI 初始化顺序。只要它被同一个 Nest 应用上下文导入一次，其他模块就能使用它导出的 `PrismaService`。

### 7.4 一句话总结

> 调换 `imports` 数组顺序通常不会影响 Provider 注入；模块之间的依赖关系应通过 `imports` 显式声明，而不是依赖数组顺序。

---

## 8. 上下级 `imports` 的依赖可见性

模块关系假设如下：

```text
AppModule
└─ imports: [OrdersModule]
   └─ imports: [UsersModule]
      └─ imports: [PrismaModule（@Global）]
```

即使 `UsersModule` 没有导出 `PrismaModule`：

```typescript
@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

`OrdersModule` 中的 Provider 仍然可以注入 `PrismaService`：

```typescript
@Module({
  imports: [UsersModule],
  providers: [OrdersService],
})
export class OrdersModule {}
```

```typescript
@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}
}
```

原因是全局模块导出的 Provider 会进入当前应用上下文的全局作用域，不需要中间模块重新导出。

### 8.1 如果没有 `@Global()`

假设移除 `@Global()`：

```typescript
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

那么会报依赖解析错误。因为普通模块的依赖可见性**不会沿着 `imports` 链自动传递**：

```text
UsersModule 导入 PrismaModule
    ≠
OrdersModule 自动获得 PrismaService
```

可以选择以下方式之一：

1. `UsersModule` 重新导出 `PrismaModule`：

```typescript
@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService, PrismaModule],
})
export class UsersModule {}
```

2. 更清晰的方式是 `OrdersModule` 直接导入它实际依赖的 `PrismaModule`：

```typescript
@Module({
  imports: [UsersModule, PrismaModule],
  providers: [OrdersService],
})
export class OrdersModule {}
```

### 8.2 一句话总结

> 当前 `PrismaModule` 使用了 `@Global()`，`OrdersModule` 可正常注入 `PrismaService`；如果去掉 `@Global()`，则需要 `UsersModule` 重新导出 `PrismaModule` 或 `OrdersModule` 直接导入 `PrismaModule`。`imports` 的上下级关系本身不会让普通模块的 Provider 自动向下传递。

---

## 9. 动态模块与 `ConfigService` 依赖

### 9.1 动态模块 ≠ 异步模块

NestJS 中的**动态模块（Dynamic Module）不等于异步模块**。

“动态”指的是：模块的元数据不是完全写死在 `@Module()` 中，而是通过静态方法，根据传入参数动态生成。

普通模块：

```typescript
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

动态模块：

```typescript
@Module({})
export class EmailModule {
  static register(options: EmailOptions): DynamicModule {
    return {
      module: EmailModule,
      providers: [
        {
          provide: EMAIL_OPTIONS,
          useValue: options,
        },
        EmailService,
      ],
      exports: [EmailService],
    };
  }
}
```

使用时：

```typescript
@Module({
  imports: [
    EmailModule.register({
      host: 'smtp.example.com',
      port: 587,
    }),
  ],
})
export class AppModule {}
```

`register()` 本身完全可以是同步的。这里的“动态”只是指根据 `options` 生成不同的 Provider 配置。

### 9.2 常见命名约定

- `register()`：通常配置当前功能模块。
- `registerAsync()`：通过依赖注入或异步逻辑生成配置。
- `forRoot()`：通常在应用根模块初始化一次共享配置。
- `forRootAsync()`：异步或通过 DI 初始化根配置。
- `forFeature()`：注册某个具体业务范围的功能。
- `forFeatureAsync()`：异步注册具体功能。

带 `Async` 的方法通常支持异步配置，但不一定真的执行网络异步操作，核心能力是允许配置工厂通过 DI 注入其他 Provider。

### 9.3 Provider 依赖 `ConfigService`

如果动态模块中的 Provider 本身依赖 `ConfigService`，需要保证动态模块能够访问 `ConfigService`。

最常见的方式是在根模块注册全局配置：

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EmailModule.register(),
  ],
})
export class AppModule {}
```

此时 `EmailService` 可以直接注入：

```typescript
@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}
}
```

`isGlobal: true` 会让 `ConfigModule` 导出的 `ConfigService` 在整个应用上下文中可见。

### 9.4 `ConfigModule` 不是全局时

如果没有设置 `isGlobal: true`：

```typescript
ConfigModule.forRoot();
```

那么依赖 `ConfigService` 的模块需要显式导入 `ConfigModule`。

可以写在静态模块元数据中：

```typescript
@Module({
  imports: [ConfigModule],
})
export class EmailModule {
  static register(): DynamicModule {
    return {
      module: EmailModule,
      providers: [EmailService],
      exports: [EmailService],
    };
  }
}
```

静态 `@Module()` 元数据和 `register()` 返回的动态元数据会被 Nest 合并。

也可以在动态模块返回值中导入：

```typescript
@Module({})
export class EmailModule {
  static register(): DynamicModule {
    return {
      module: EmailModule,
      imports: [ConfigModule],
      providers: [EmailService],
      exports: [EmailService],
    };
  }
}
```

关键点：

> `ConfigModule` 必须在声明并创建 `EmailService` 的模块上下文中可见，仅在 `AppModule` 同级导入二者不一定能建立依赖可见关系，除非 `ConfigModule` 是全局模块。

### 9.5 `registerAsync` / `forRootAsync` 依赖 `ConfigService`

调用动态模块时，使用 `ConfigService` 生成模块配置：

```typescript
EmailModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    host: configService.getOrThrow<string>('EMAIL_HOST'),
    port: configService.getOrThrow<number>('EMAIL_PORT'),
  }),
});
```

其内部可以实现为：

```typescript
@Module({})
export class EmailModule {
  static registerAsync(options: EmailAsyncOptions): DynamicModule {
    return {
      module: EmailModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: EMAIL_OPTIONS,
          inject: options.inject ?? [],
          useFactory: options.useFactory,
        },
        EmailService,
      ],
      exports: [EmailService],
    };
  }
}
```

各字段的作用：

- `imports: [ConfigModule]`：让这个动态模块上下文可以访问 `ConfigService`。
- `inject: [ConfigService]`：把 `ConfigService` 注入 `useFactory`。
- `useFactory`：根据 `ConfigService` 生成模块配置。
- `useFactory` 可以返回普通对象，也可以返回 `Promise`。

异步工厂示例：

```typescript
useFactory: async (configService: ConfigService) => {
  const credentials = await loadCredentials();

  return {
    host: configService.getOrThrow('EMAIL_HOST'),
    credentials,
  };
};
```

### 9.6 区分两种依赖

第一种是模块内部的业务 Provider 依赖配置：

```typescript
@Injectable()
export class EmailService {
  constructor(configService: ConfigService) {}
}
```

这要求 `EmailModule` 导入 `ConfigModule`，或者 `ConfigModule` 全局可用。

第二种是用于创建配置对象的工厂依赖配置：

```typescript
EmailModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({ ... }),
})
```

这不仅要求 `imports`，通常还必须在 `inject` 中明确写出 `ConfigService`，否则 Nest 不会自动把它传给 `useFactory`。

### 9.7 一句话总结

> 动态模块表示“运行时根据参数生成模块元数据”，不等于异步。`register()`、`forRoot()` 通常是同步配置；`registerAsync()`、`forRootAsync()` 支持通过 DI 和异步工厂生成配置。Provider 依赖 `ConfigService` 时，所在模块必须导入 `ConfigModule` 或将配置设为全局；`useFactory` 依赖 `ConfigService` 时，需要配置 `imports: [ConfigModule]` 和 `inject: [ConfigService]`。

---

## 10. 总结速查表

| 主题                              | 关键结论                                                        |
| --------------------------------- | --------------------------------------------------------------- |
| Module / Provider 默认作用域      | Module 单例；Provider 默认 `Scope.DEFAULT` 单例                 |
| Provider 自定义作用域             | `Scope.REQUEST`、`Scope.TRANSIENT`                              |
| `exports` 不在 `providers` 中     | 报错，Nest 不知道如何创建该 Provider                            |
| `imports` 中放 Service            | 错误，`imports` 应放模块                                        |
| `exports: [xxxModule]` 含义       | 重新导出 `xxxModule` 的 `exports`                               |
| 中间模块能否使用底层 Provider     | 必须先 `imports`，再 `exports`                                  |
| `@Global()` 是否完全不用导入      | 否，仍需至少导入一次                                            |
| 子模块导入全局模块                | 其他模块无需重复导入                                            |
| `imports` 数组顺序                | 通常不影响 DI 注入，但不应作为依赖声明                          |
| 上下级 `imports` 不带 `@Global`   | 不自动传递 Provider 可见性                                      |
| 动态模块 vs 异步                  | 动态模块 ≠ 异步模块；`Async` 后缀的方法支持异步配置             |
| Provider 依赖 `ConfigService`     | 所在模块需导入 `ConfigModule`，或将 `ConfigModule` 设为全局     |
| `useFactory` 依赖 `ConfigService` | 同时配置 `imports: [ConfigModule]` 和 `inject: [ConfigService]` |

---

## 11. 一句话结论

> `@Module()` 的 `imports` / `exports` / `providers` 分别决定“自己用谁”、“给谁用”、“自己拥有谁”。全局模块靠 `@Global()` 让 Provider 在应用上下文内可见，但模块本身仍需导入一次；动态模块按参数生成元数据，是否异步取决于具体方法名；模块依赖应显式声明，不应依赖 `imports` 数组顺序或隐式的上下级传递。
