import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { LoginService } from './login.service';
import { LoginAuthGuard } from './login.guard';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@Controller()
export class LoginController {
  constructor(private loginService: LoginService) {}

  @Post('login')
  @UseGuards(LoginAuthGuard) // 登录守卫，其实就是走登录策略，验证通过后返回到 req.user 中
  async login(@Req() req: Request & { user: AuthenticatedUser }) {
    const user = req.user;
    return this.loginService.login(user);
  }
}
