import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginService } from './login.service';
import { UsersModule } from '../users/users.module';
import { LoginStrategy } from './login.strategy';
import { JwtModule } from '@nestjs/jwt';
import { TOKEN_EXPIRES_IN } from '@/config/constants';
import { PassportModule } from '@nestjs/passport';
import { LoginController } from './login.controller';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: TOKEN_EXPIRES_IN },
      }),
    }),
  ],
  controllers: [LoginController],
  providers: [LoginService, LoginStrategy],
  exports: [],
})
export class LoginModule {}
