import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { HttpService } from '@nestjs/axios';
import { RoleEntity } from './entities/role.entity';
import { DEFAULT_USER_ROLE_ID } from '@/config/constants';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  private async attachUserRoles<T extends { id: string }>(
    users: T | T[] | null,
  ): Promise<(T & { user_roles: RoleEntity[] }) | Array<T & { user_roles: RoleEntity[] }> | null> {
    if (!users) {
      return null;
    }

    const userList = Array.isArray(users) ? users : [users];
    const userIds = userList.map((user) => user.id);

    const userRoles = await this.prisma.t_user_role.findMany({
      where: {
        user_id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        user_id: true,
        role_id: true,
      },
    });

    const roleIds = Array.from(new Set(userRoles.map((userRole) => userRole.role_id)));
    const roles = roleIds.length > 0 ? await this.getRoleList(roleIds) : [];
    const roleMap = new Map(roles.map((role) => [role.id, role]));
    const userRoleMap = new Map<string, RoleEntity[]>();

    for (const userRole of userRoles) {
      const role = roleMap.get(userRole.role_id);

      if (!role) {
        continue;
      }

      const currentUserRoles = userRoleMap.get(userRole.user_id) ?? [];

      currentUserRoles.push(role);
      userRoleMap.set(userRole.user_id, currentUserRoles);
    }

    const mappedUsers = userList.map((user) => ({
      ...user,
      user_roles: userRoleMap.get(user.id) ?? [],
    }));

    return Array.isArray(users) ? mappedUsers : mappedUsers[0];
  }

  async create(createUserDto: CreateUserDto) {
    const { roles, ...userData } = createUserDto;
    // 对请求的 roles 进行去重和过滤
    const roleIds = Array.from(new Set(roles?.filter(Boolean) ?? []));
    const targetRoleIds = roleIds.length > 0 ? roleIds : [DEFAULT_USER_ROLE_ID];
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      // 先判断角色是否存在
      // 如果角色不存在，抛出异常
      const matchedRoles = await tx.t_role.findMany({
        where: {
          id: {
            in: targetRoleIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (matchedRoles.length !== targetRoleIds.length) {
        throw new BadRequestException('存在无效的角色 ID');
      }

      const createdUser = await tx.t_user.create({
        data: {
          id: randomUUID(),
          ...userData,
          password: hashedPassword,
        },
      });

      // 创建用户角色关联
      await tx.t_user_role.createMany({
        data: targetRoleIds.map((roleId) => ({
          user_id: createdUser.id,
          role_id: roleId,
        })),
      });

      return tx.t_user.findUniqueOrThrow({
        where: {
          id: createdUser.id,
        },
      });
    });

    const userWithRoles = await this.attachUserRoles(user);
    return plainToInstance(UserEntity, userWithRoles);
  }

  async findAll() {
    const users = await this.prisma.t_user.findMany();
    const usersWithRoles = await this.attachUserRoles(users);

    return plainToInstance(UserEntity, usersWithRoles);
  }

  /**
   * 用于用户名认证的查询用户方法
   */
  async findOneForAuth(username: string) {
    const user = await this.prisma.t_user.findUnique({
      where: { username },
    });

    if (!user) {
      return null;
    }

    const userRoles = await this.prisma.t_user_role.findMany({
      where: {
        user_id: user.id,
      },
      select: {
        role_id: true,
      },
    });

    const roleIds = Array.from(new Set(userRoles.map((userRole) => userRole.role_id)));
    const roles = await this.getRoleList(roleIds);

    return {
      ...user,
      user_roles: roles,
    };
  }

  /**
   * 获取角色列表
   */
  async getRoleList(roleIds?: string[]) {
    if (roleIds && roleIds.length === 0) {
      return [];
    }

    const roles = await this.prisma.t_role.findMany({
      where: roleIds?.length
        ? {
            id: {
              in: roleIds,
            },
          }
        : undefined,
      select: {
        id: true,
        role_id: true,
        role_label: true,
        role_type: true,
      },
    });
    return plainToInstance(RoleEntity, roles);
  }
}
