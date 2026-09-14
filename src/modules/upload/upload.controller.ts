import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';

import { DeleteFileDto } from './dto/delete-file.dto';
import { UploadService } from './upload.service';

@Controller('file')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传 file 字段的文件');
    }

    return this.uploadService.upload(file);
  }

  @Post('delete')
  delete(@Body() body: DeleteFileDto) {
    return this.uploadService.delete(body.objectName);
  }
}
