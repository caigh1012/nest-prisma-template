## Prisma连接数据库

### 1、安装Prisma

```bash
pnpm add prisma @types/pg --save-dev
pnpm add @prisma/client @prisma/adapter-pg pg dotenv
```

### 2、配置Prisma

```bash
npx prisma init --datasource-provider postgresql --output ../generated/prisma
```

### 3、配置环境变量

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

### 4、定义你的数据模型

```tex
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
datasource db {
  provider = "postgresql"
}

# 定义的 User 模型
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

# 定义的 Post 模型
model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

对 model 进行迁移

### 5、迁移数据库

```bash
npx prisma migrate dev --name init
```

### 6、生成 Prisma 客户端

```bash
npx prisma generate
```

该命令会通过 output 属性生成到对应位置的客户端，用于后续实例化

并且每次迁移数据库后，都需要重新生成 Prisma 客户端，否则会报错

### 7、实例化 Prisma Client

```typescript
// lib/prisma.ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
export { prisma };
```

### 8、Next.js 中使用 Prisma Client

参考官网：https://www.prisma.io/docs/guides/frameworks/nextjs#introduction
