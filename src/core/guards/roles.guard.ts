import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '@/core/decorators/roles.decorator';
import { Role } from '@/config/role.enum';
import { AuthedUser } from '@/types/user/authed-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    /**
     * 从上下文获取允许访问的角色列表。
     */
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    /**
     * 从上下文获取用户信息。
     */
    const request = context.switchToHttp().getRequest<Request & { user?: AuthedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const ownedRoles = this.resolveUserRoles(user);

    if (ownedRoles.length === 0) {
      throw new ForbiddenException('Current user has no assigned roles');
    }

    const requiredRoleSet = new Set(requiredRoles.map((role) => this.normalizeRole(role)));
    // 匹配用户角色是否包含允许访问的角色
    const hasPermission = ownedRoles.some((role) => requiredRoleSet.has(role));

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }

  private resolveUserRoles(user: AuthedUser) {
    return this.extractRolesFromUser(user);
  }

  private extractRolesFromUser(user: AuthedUser) {
    if (Array.isArray(user.roles)) {
      return Array.from(new Set(user.roles.map((role) => this.normalizeRole(role))));
    }

    return [];
  }

  private normalizeRole(role: string) {
    return role.trim().toLowerCase();
  }
}
