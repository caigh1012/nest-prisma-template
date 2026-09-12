import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { AuthedUser } from '@/types/user/authed-user';

@Injectable()
export class LoginService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * 返回的用户信息，会存在 context.user 中
   */
  async validateUser(username: string, pass: string): Promise<AuthedUser | null> {
    const user = await this.usersService.findOneForAuth(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return {
        id: user.id,
        roles: user.user_roles.map((role) => role.role_id),
      };
    }
    return null;
  }

  /**
   * 登录之后返回token
   * @param user 已认证用户
   * @returns token
   */
  async login(user: AuthedUser) {
    const payload = { sub: user.id, roles: user.roles };
    return {
      token: this.jwtService.sign(payload),
    };
  }
}
