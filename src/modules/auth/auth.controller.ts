import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthGuard } from '../shared/guards/login.guard';
import { UserEntity } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LoginAuthGuard) // 登录守卫，其实就是走登录策略，验证通过后返回到 req.user 中
  async login(@Req() req: Request & { user: UserEntity }) {
    const user = req.user;
    return this.authService.login(user);
  }
}
