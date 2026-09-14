import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Express } from 'express';
import { MinioService } from '@/core/minio/minio.service';

@Injectable()
export class UploadService {
  constructor(private readonly minioService: MinioService) {}

  async upload(file: Express.Multer.File) {
    if (!file.buffer?.length) {
      throw new BadRequestException('上传文件不能为空');
    }

    const bucketName = this.minioService.getBucketName();
    await this.minioService.ensureBucket(bucketName);

    const fileExtension = extname(file.originalname);
    const objectName = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${fileExtension}`;

    await this.minioService.uploadObject(bucketName, objectName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const url = await this.minioService.createPresignedDownloadUrl(bucketName, objectName);

    return {
      bucketName,
      objectName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
    };
  }

  async delete(objectName: string) {
    const normalizedObjectName = objectName.trim();

    if (!normalizedObjectName) {
      throw new BadRequestException('objectName 不能为空');
    }

    if (!normalizedObjectName.startsWith('uploads/')) {
      throw new BadRequestException('只允许删除 uploads 目录下的文件');
    }

    const bucketName = this.minioService.getBucketName();
    const bucketExists = await this.minioService.bucketExists(bucketName);

    if (!bucketExists) {
      throw new NotFoundException(`存储桶 ${bucketName} 不存在`);
    }

    try {
      await this.minioService.statObject(bucketName, normalizedObjectName);
    } catch {
      throw new NotFoundException('文件不存在或已被删除');
    }

    await this.minioService.removeObject(bucketName, normalizedObjectName);

    return {
      bucketName,
      objectName: normalizedObjectName,
      deleted: true,
    };
  }
}
