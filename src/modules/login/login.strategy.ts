import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginService } from './login.service';

@Injectable()
export class LoginStrategy extends PassportStrategy(Strategy, 'login') {
  constructor(private readonly loginService: LoginService) {
    super({
      usernameField: 'username',
      passwordField: 'password',
    });
  }

  async validate(username: string, password: string) {
    const user = await this.loginService.validateUser(username, password);
    console.log(user, '<___user78789798');
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
