# 模块间导入规范与边界约束

本文针对当前项目中这类写法进行整理：

```ts
import { UserEntity } from '../users/entities/user.entity';
```

它表面上只是一次普通导入，但从模块设计上看，`login` 模块已经直接依赖了 `users` 模块的内部实现细节。项目规模变大后，这类写法会让模块之间越来越耦合，最终出现下面几类问题：

- 模块边界变模糊，任何模块都可以直接访问别的模块内部目录
- 一个模块内部重构时，可能会影响很多外部模块
- 代码评审时很难快速判断“这是合法的吗”
- 导入路径越来越深，维护成本越来越高

## 当前项目推荐原则

### 1. 同模块内部，允许相对路径导入

例如 `login` 模块内部：

```ts
import { LoginService } from './login.service';
import { LoginAuthGuard } from './login.guard';
```

这种写法是合理的，因为它们都属于同一个模块内部实现。

### 2. 跨模块导入，不要直接访问对方内部目录

不推荐：

```ts
import { UserEntity } from '../users/entities/user.entity';
import { SomeRepo } from '../orders/repositories/order.repository';
```

这些写法的问题不是路径长，而是“直接进入别的模块内部目录”。

跨模块导入时，应该只依赖对方显式暴露出来的公开能力，而不是依赖它的内部文件结构。

### 3. 跨模块传递数据，优先依赖契约，不要依赖内部实体

例如 `login` 模块真正需要的并不是完整的 `UserEntity`，而只是登录后生成 token 所需的最小用户信息，例如：

```ts
export interface AuthenticatedUser {
  id: string;
  username: string;
}
```

这种类型更适合作为模块间契约：

- 语义更清楚
- 依赖更小
- 对 `users` 模块内部实现的耦合更低

也就是说：

- `entity` 更适合留在模块内部使用
- `dto` / `contract` / `type` 更适合跨模块传递

## 推荐的导入层级

建议把项目中的导入关系约束成下面几层：

### 第一层：模块内部实现

只允许在模块内部使用：

- `entities/`
- `repositories/`
- `services/internal/`
- Prisma 查询细节

这类内容默认不应该被其他模块直接导入。

### 第二层：模块公开入口

每个模块只通过公开入口对外暴露能力，例如：

```ts
@/modules/users
@/modules/login
```

如果某个模块确实需要对外暴露类型、DTO、服务接口，可以在模块根目录下统一导出，而不是让外部模块直接访问深层文件。

例如：

```ts
// src/modules/users/index.ts
export { UsersModule } from './users.module';
export type { PublicUserProfile } from './contracts/public-user-profile.type';
```

然后外部模块只这样导入：

```ts
import type { PublicUserProfile } from '@/modules/users';
```

### 第三层：共享契约

如果多个模块都要依赖同一组类型，可以放到更明确的共享层，例如：

- `src/modules/shared`
- `src/contracts`
- `src/common/types`

但前提是它真的是共享契约，而不是把某个模块内部实现“搬出来继续暴露”。

## 当前项目里的建议落地方式

### 1. 优先统一使用 `@/` 路径别名做跨模块导入

当前项目已经在 [`../tsconfig.json`](../tsconfig.json) 中配置了：

```json
"baseUrl": "./",
"paths": {
  "@/*": ["src/*"]
}
```

因此建议统一约定：

- 同模块内部：使用 `./`、`../`
- 跨模块：使用 `@/`

例如：

```ts
import { UsersService } from '@/modules/users/users.service';
```

不过要注意，这只是路径表达更清晰，并不自动解决“深层导入”问题。

所以更完整的约束应该是：

- 允许 `@/modules/users`
- 尽量避免 `@/modules/users/entities/user.entity`

### 2. 为模块建立公开出口

如果后续模块越来越多，建议逐步为每个模块建立 `index.ts`，把允许对外访问的内容统一从模块根导出。

例如：

- `src/modules/users/index.ts`
- `src/modules/login/index.ts`

这样做的价值是：

- 外部模块只能依赖公开 API
- 模块内部结构可以逐步重构
- 代码评审时更容易发现违规导入

### 3. 模块间只传递最小必要类型

对于认证、授权、事件、查询结果这类跨模块数据，建议每个场景定义自己的最小契约，而不是复用完整实体。

例如认证场景下的：

```ts
export interface AuthenticatedUser {
  id: string;
  username: string;
}
```

比直接依赖 `UserEntity` 更稳定，因为登录模块并不关心 `email`、`avatarUrl`、`gender` 等字段。

## 建议形成的团队规范

可以直接把下面几条作为项目约定：

1. 同模块内部允许相对路径导入
2. 跨模块必须优先使用 `@/` 路径别名
3. 跨模块禁止直接导入其他模块的 `entities`、`repositories`、`internal` 等内部目录
4. 跨模块传递数据时，优先使用 DTO、Type、Contract，而不是内部 Entity
5. 每个模块逐步建立公开入口文件 `index.ts`

## 后续建议：用 ESLint 把规则固化

如果只是口头约定，随着项目变大，规则很容易失效。更稳妥的做法是增加 ESLint 规则，直接限制这类导入。

例如可以约束：

- 禁止导入 `@/modules/*/entities/*`
- 禁止导入 `@/modules/*/repositories/*`
- 禁止跨模块使用 `../other-module/**`

这样在提交代码时就能提前发现问题，而不是等到结构混乱后再回头整理。

## 一句话结论

这类问题的重点不是“把相对路径改成绝对路径”，而是把模块之间的依赖收敛到“公开契约”和“公开入口”上。

更推荐的方向是：

- 模块内部自由组织实现
- 模块外部只依赖公开 API
- 跨模块只传递最小必要类型
- 最终通过 ESLint 规则做自动约束
