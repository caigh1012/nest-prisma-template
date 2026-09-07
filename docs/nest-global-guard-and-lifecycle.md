# 全局守卫注册方式与执行顺序

## 更适合当前项目的理解

当前项目里更合适的理解是：

- `src/app.module.ts` 里的 `APP_GUARD` 是正式的全局守卫注册方式
- `src/main.ts` 里的 `app.useGlobalGuards(new JwtAuthGuard())` 只是另一种可选写法
- 两者不要同时启用，否则会造成重复注册

## `APP_GUARD` 和 `useGlobalGuards` 的区别

它们都可以实现“全局守卫”，但有一个关键区别：

### `APP_GUARD`

- 走 Nest 的 DI 容器
- 守卫后续如果需要注入 `Reflector`、`ConfigService` 或其他 service，会更自然
- 更符合 Nest 推荐写法

### `app.useGlobalGuards(new JwtAuthGuard())`

- 这是手动 `new` 一个守卫实例
- 当前项目里的 `JwtAuthGuard` 没有构造函数依赖，所以现在这样写也能工作
- 但如果以后守卫需要注入依赖，就需要调整写法，维护性会差一些

## 当前项目的建议

结论如下：

- 功能上可以把全局守卫从 `APP_GUARD` 改成 `app.useGlobalGuards(...)`
- 但当前项目不建议这样改
- 更稳妥的做法是继续保留 `APP_GUARD`

## 全局组件的执行顺序

需要注意，`main.ts` 中这些全局配置虽然是顺序写下来的，但运行时并不是按代码书写顺序串行执行，而是遵循 Nest 固定的请求生命周期。

请求进入后的整体顺序是：

`Middleware -> Guard -> Interceptor(前置) -> Pipe -> Controller / Handler -> Interceptor(后置) -> Exception Filter`

结合当前项目，可以理解为：

`loggerMiddleware -> JwtAuthGuard -> ClassSerializerInterceptor(前置) -> ValidationPipe -> Controller -> ClassSerializerInterceptor(后置) -> HttpExceptionFilter(仅异常时)`

## 各个全局能力在当前项目中的位置

### `useGlobalGuards`

- 对应守卫阶段
- 用于决定请求是否允许进入控制器
- 当前项目中实际使用的是 `APP_GUARD` 注册的 `JwtAuthGuard`

### `useGlobalFilters`

- 对应异常过滤阶段
- 只有在请求处理过程中抛出异常时才会接管
- 当前项目中是 `HttpExceptionFilter`

### `useGlobalPipes`

- 对应管道阶段
- 在参数解析和校验时触发
- 当前项目中是 `ValidationPipe`

### `useGlobalInterceptors`

- 对应拦截器阶段
- 会包裹控制器执行过程，分为前置和后置两部分
- 当前项目中是 `ClassSerializerInterceptor`
- 它主要在响应返回阶段参与序列化

### `useLogger`

- `app.useLogger(app.get(Logger))` 不属于请求处理链中的某个执行环节
- 它的作用是把 Nest 的全局日志实现切换成 `pino Logger`
- 它不会参与 Guard、Pipe、Interceptor、Filter 之间的执行先后

## 需要特别注意的一点

`useGlobalFilters`、`useGlobalPipes`、`useGlobalInterceptors` 虽然都写在 `main.ts` 里，但它们之间并不是“谁先注册谁先执行”的关系，而是处在 Nest 请求生命周期中的不同固定位置。
