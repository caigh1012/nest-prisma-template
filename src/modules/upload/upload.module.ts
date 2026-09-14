import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [],
})
export class UploadModule {}
