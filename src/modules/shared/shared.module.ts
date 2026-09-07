import { Module } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Module({
  imports: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class SharedModule {}
