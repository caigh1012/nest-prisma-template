import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SharedModule } from '../shared/shared.module';

//  用于发送 HTTP 请求，请求外部应用数据
import { HttpModule } from '@nestjs/axios';

/**
 * 用户模块
 */
@Module({
  imports: [HttpModule, SharedModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
