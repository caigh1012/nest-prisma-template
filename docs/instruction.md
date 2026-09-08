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

## @nestjs/event-emitter
