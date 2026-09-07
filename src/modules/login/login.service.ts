import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@Injectable()
export class LoginService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      return user;
    }
    return null;
  }

  /**
   * 登录之后返回token
   * @param user 已认证用户
   * @returns token
   */
  async login(user: AuthenticatedUser) {
    const payload = { username: user.username, sub: user.id };
    return {
      token: this.jwtService.sign(payload),
    };
  }
}
