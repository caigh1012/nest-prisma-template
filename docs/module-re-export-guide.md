# NestJS 模块 Re-export 使用说明

## 1. 文档目的

本文说明 NestJS 中 `@Module()` 的 `imports` 与 `exports` 在模块再导出（Re-exporting）场景下的正确用法，并重点回答以下问题：

> 如果 `CoreModule` 只在 `exports` 中导出 `CommonModule`，没有在 `imports` 中导入 `CommonModule`，那么 `CoreModule` 自身的作用域还能使用 `CommonModule` 的依赖吗？

**结论：不能。**  
`CoreModule` 必须在 `imports` 中导入 `CommonModule`，才能在自身作用域内使用 `CommonModule` 导出的 provider。只在 `exports` 中写 `CommonModule` 是不够的，也不是规范的 re-export 写法。

---

## 2. 核心概念

### 2.1 `imports`

`imports` 表示当前模块依赖哪些模块。

被导入模块中 **已经导出** 的 provider，会进入当前模块的依赖查找上下文，因此当前模块的 `providers` 可以注入这些 provider。

```ts
@Module({
  imports: [CommonModule],
})
export class CoreModule {}
```

### 2.2 `exports`

`exports` 表示当前模块向外部暴露哪些 provider 或模块。

它影响的是 **其他导入当前模块的模块**，不会反过来让当前模块获得这些 provider。

```ts
@Module({
  exports: [CommonModule],
})
export class CoreModule {}
```

### 2.3 方向对比

| 元数据    | 作用方向        | 含义                                       |
| --------- | --------------- | ------------------------------------------ |
| `imports` | 外部 → 当前模块 | 当前模块可以使用谁导出的 provider          |
| `exports` | 当前模块 → 外部 | 外部可以使用当前模块的哪些 provider / 模块 |

一句话总结：

> `imports` 是“自己用”，`exports` 是“给别人用”。  
> Re-export 的本质是：先 `imports`，再 `exports`。

---

## 3. 错误示例：只 `exports` 不 `imports`

### 3.1 `CommonModule`

```ts
// common.module.ts
import { Injectable, Module } from '@nestjs/common';

@Injectable()
export class CommonService {}

@Module({
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
```

`CommonModule` 导出了 `CommonService`，所以任何导入 `CommonModule` 的模块都可以使用 `CommonService`。

### 3.2 错误的 `CoreModule`

```ts
// core.module.ts
import { Injectable, Module } from '@nestjs/common';
import { CommonModule } from './common.module';
import { CommonService } from './common.service';

@Injectable()
export class CoreService {
  constructor(private readonly commonService: CommonService) {}
}

@Module({
  // 缺少 imports: [CommonModule]
  exports: [CommonModule],
  providers: [CoreService],
})
export class CoreModule {}
```

### 3.3 运行结果

启动时会出现类似错误：

```text
Nest can't resolve dependencies of the CoreService (?, ...).
Please make sure that the argument CommonService at index [0] is available in the CoreModule context.
```

原因：

- `CoreModule` 没有 `imports: [CommonModule]`。
- 因此 `CommonModule` 导出的 `CommonService` 没有进入 `CoreModule` 的依赖查找上下文。
- `CoreModule` 里的 `CoreService` 无法注入 `CommonService`。
- `exports: [CommonModule]` 只影响其他模块，不会让 `CoreModule` 自己获得 `CommonService`。

---

## 4. 为什么只 `exports` 不 `imports` 不行？

NestJS 在启动时会根据模块的 `imports` 构建模块依赖图。

依赖查找大致顺序如下：

1. 先查找当前模块自己的 `providers`。
2. 如果找不到，再沿着当前模块的 `imports` 查找被导入模块中 `exports` 的 provider。
3. 如果还找不到，再查找全局模块 `@Global()` 导出的 provider。

关键点：

- `imports` 会建立模块之间的依赖边。
- `exports` 只是声明“我可以把哪些 provider 或模块暴露出去”。
- `exports` 不会把 provider 反向加入当前模块的注入容器。

因此：

```ts
@Module({
  exports: [CommonModule],
})
export class CoreModule {}
```

这段代码没有建立 `CoreModule -> CommonModule` 的依赖边。  
`CoreModule` 自己的 `providers` 无法使用 `CommonModule` 的 provider。

---

## 5. 正确示例：Re-export 必须先 `imports` 再 `exports`

### 5.1 `CommonModule`

```ts
// common.module.ts
import { Injectable, Module } from '@nestjs/common';

@Injectable()
export class CommonService {}

@Module({
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
```

### 5.2 正确的 `CoreModule`

```ts
// core.module.ts
import { Injectable, Module } from '@nestjs/common';
import { CommonModule } from './common.module';
import { CommonService } from './common.service';

@Injectable()
export class CoreService {
  constructor(private readonly commonService: CommonService) {}
}

@Module({
  imports: [CommonModule], // CoreModule 自己可以使用 CommonService
  exports: [CommonModule], // 其他导入 CoreModule 的模块也能使用 CommonService
  providers: [CoreService],
})
export class CoreModule {}
```

此时：

- `CoreModule` 内部的 `CoreService` 可以注入 `CommonService`。
- 其他模块导入 `CoreModule` 后，也可以使用 `CommonService`，因为 `CoreModule` 重新导出了 `CommonModule`。

### 5.3 其他模块使用 Re-export

```ts
// feature.module.ts
import { Injectable, Module } from '@nestjs/common';
import { CoreModule } from './core.module';
import { CommonService } from './common.service';

@Injectable()
export class FeatureService {
  constructor(private readonly commonService: CommonService) {}
}

@Module({
  imports: [CoreModule],
  providers: [FeatureService],
})
export class FeatureModule {}
```

这里 `FeatureModule` 没有直接导入 `CommonModule`，而是导入了 `CoreModule`。  
因为 `CoreModule` 已经：

1. `imports: [CommonModule]`
2. `exports: [CommonModule]`

所以 `FeatureModule` 可以通过 `CoreModule` 使用 `CommonModule` 导出的 `CommonService`。

---

## 6. 对其他模块的影响

如果写成：

```ts
@Module({
  exports: [CommonModule],
})
export class CoreModule {}
```

其他模块再：

```ts
@Module({
  imports: [CoreModule],
})
export class FeatureModule {}
```

从语义上说，这不是规范的 re-export。  
虽然某些 NestJS 版本或特定场景下可能尝试从 `exports` 中解析 `CommonModule`，但这属于未定义行为或实现细节，不应依赖。

推荐始终遵循官方语义：

> 要重新导出某个模块，必须先在 `imports` 中导入它。

正确写法：

```ts
@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class CoreModule {}
```

---

## 7. 常见使用场景

### 7.1 `CoreModule` 自己要用，也要给别人用

```ts
@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class CoreModule {}
```

这是标准 re-export。

### 7.2 `CoreModule` 自己要用，但不给别人用

```ts
@Module({
  imports: [CommonModule],
  // 不 exports
})
export class CoreModule {}
```

`CoreModule` 自己可以使用 `CommonService`，但其他模块不能通过 `CoreModule` 使用它。

### 7.3 其他模块要用，但 `CoreModule` 自己不用

规范上仍然建议：

```ts
@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class CoreModule {}
```

不要写成只 `exports` 不 `imports`。

### 7.4 全局模块

如果某个模块几乎每个模块都要用，可以使用 `@Global()`：

```ts
@Global()
@Module({
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
```

全局模块只需要在根模块中导入一次，其导出的 provider 就可以被其他模块使用。  
但注意：全局模块仍然必须 `exports` 目标 provider。

---

## 8. 最佳实践

1. **Re-export 必须同时写 `imports` 和 `exports`。**

   ```ts
   @Module({
     imports: [CommonModule],
     exports: [CommonModule],
   })
   export class CoreModule {}
   ```

2. **不要依赖“只 `exports` 不 `imports`”的写法。**  
   这不是规范的 re-export，可能导致启动报错或版本行为不一致。

3. **明确模块公共 API。**  
   只有确实需要给外部使用的 provider 才放进 `exports`。

4. **使用 `CoreModule` / `SharedModule` 聚合通用模块。**  
   这样业务模块只需要导入 `CoreModule`，而不必重复导入大量基础模块。

5. **注意循环依赖。**  
   如果两个模块相互导入，可以使用 `forwardRef()`，但更推荐重构代码，减少双向依赖。

6. **启动报错时检查三件事：**
   - 目标 provider 是否在源模块中 `exports`？
   - 当前模块是否 `imports` 了源模块？
   - 如果通过中间模块 re-export，中间模块是否同时 `imports` 和 `exports` 了源模块？

---

## 9. 快速检查清单

- [ ] `CommonModule` 是否 `exports` 了 `CommonService`？
- [ ] `CoreModule` 是否 `imports` 了 `CommonModule`？
- [ ] `CoreModule` 是否 `exports` 了 `CommonModule`？
- [ ] `CoreModule` 自己的 provider 是否需要注入 `CommonService`？
- [ ] 其他模块是否通过 `CoreModule` 间接使用 `CommonService`？
- [ ] 是否存在循环依赖，需要 `forwardRef()` 或重构？

---

## 10. 总结

| 写法                                                  | `CoreModule` 自己能否使用 `CommonService` | 其他模块导入 `CoreModule` 后能否使用 `CommonService` | 是否推荐 |
| ----------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- | -------- |
| `exports: [CommonModule]`                             | 不能                                      | 不确定，不规范                                       | 不推荐   |
| `imports: [CommonModule]`                             | 能                                        | 不能                                                 | 可以     |
| `imports: [CommonModule]` + `exports: [CommonModule]` | 能                                        | 能                                                   | 推荐     |

最终结论：

> `imports` 是自用，`exports` 是公用。  
> Re-export 的正确姿势是：先 `imports`，再 `exports`。  
> 只 `exports` 不 `imports`，`CoreModule` 自身无法使用 `CommonModule` 的依赖。
