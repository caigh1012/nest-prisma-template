import { Global, Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { MinioService } from './minio/minio.service';

@Global()
@Module({
  providers: [PrismaService, MinioService],
  exports: [PrismaService, MinioService],
})
export class CoreModule {}
