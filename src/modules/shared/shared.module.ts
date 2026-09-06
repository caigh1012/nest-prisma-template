import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LoginAuthGuard } from './guards/login.guard';

@Global()
@Module({
  providers: [PrismaService, LoginAuthGuard],
  exports: [PrismaService, LoginAuthGuard],
})
export class SharedModule {}
