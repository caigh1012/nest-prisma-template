## 项目环境配置

使用 @nestjs/config 加载项目环境变量，并通过 ConfigService 获取配置值

## 请求日志

使用 nestjs-pino pino-http pino pino-roll 配置请求日志记录

## 网络攻击

由于项目中使用的是 jwt 认证，所以不需要配置 csrf 攻击防御措施。这里就没有用到官方的 csrf-csrf 、以及 cookie-parser 等 npm 库

## middlewares 中间件

在控制器执行前/后运行，处理 HTTP 层逻辑（如日志、CORS）

## 异常过滤器

在方法执行后运行，处理异常（如验证失败、数据库错误）并返回统一响应。

## pipes 管道

管道有两种典型用途：

转换：将输入数据转换为所需格式（例如，从字符串转换为整数）
验证：评估输入数据，如果有效，则直接传递，否则抛出异常。

## interceptors 拦截器

在方法执行前后运行，可修改响应、抛出异常、缓存等；

## guards 授权和验证（守卫实现）

详细见 [passport-module-and-global-jwt-auth.md](./passport-module-and-global-jwt-auth.md)

## @nestjs/event-emitter
