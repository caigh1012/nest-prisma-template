import { SetMetadata } from '@nestjs/common';
import { Role } from '@/config/role.enum';
import { ROLES_KEY } from '@/config/constants';

/**
 * 为控制器或路由声明允许访问的角色列表。只会在启动时进行解析，不会在运行时进行解析。
 */
export const Roles = (...roles: Role[]) => {
  return SetMetadata(ROLES_KEY, Array.from(new Set(roles)));
};
