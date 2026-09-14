import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, type BucketItemStat, type ClientOptions, type ItemBucketMetadata } from 'minio';
import { Readable } from 'node:stream';
import { parsePort } from 'src/utils/parse-port';

type MinioUploadResult = Awaited<ReturnType<Client['putObject']>>;

@Injectable()
export class MinioService {
  private readonly client: Client;

  constructor(private readonly configService: ConfigService) {
    const options: ClientOptions = {
      endPoint: configService.getOrThrow<string>('MINIO_ENDPOINT'),
      port: parsePort(configService.get<string>('MINIO_PORT')),
      useSSL: configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: configService.getOrThrow<string>('MINIO_ACCESS_KEY_ID'),
      secretKey: configService.getOrThrow<string>('MINIO_SECRET_ACCESS_KEY'),
    };

    this.client = new Client(options);
  }

  /**
   * 获取 MinIO 客户端实例。
   */
  getClient() {
    return this.client;
  }

  /**
   * 获取默认的 MinIO 存储桶名称。
   */
  getBucketName() {
    return this.configService.getOrThrow<string>('MINIO_BUCKET_NAME');
  }

  /**
   * 检查指定存储桶是否存在。
   */
  async bucketExists(bucketName: string) {
    return this.client.bucketExists(bucketName);
  }

  /**
   * 在存储桶不存在时创建存储桶。
   */
  async ensureBucket(bucketName: string, region?: string) {
    const exists = await this.client.bucketExists(bucketName);

    if (!exists) {
      await this.client.makeBucket(bucketName, region ?? '');
    }
  }

  /**
   * 上传对象到指定存储桶。
   */
  async uploadObject(
    bucketName: string,
    objectName: string,
    data: Readable | Buffer | string,
    size?: number,
    metaData?: ItemBucketMetadata,
  ): Promise<MinioUploadResult> {
    return this.client.putObject(bucketName, objectName, data, size, metaData);
  }

  /**
   * 获取对象内容的可读流。
   */
  async getObjectStream(bucketName: string, objectName: string) {
    return this.client.getObject(bucketName, objectName);
  }

  /**
   * 获取对象的元数据信息。
   */
  async statObject(bucketName: string, objectName: string): Promise<BucketItemStat> {
    return this.client.statObject(bucketName, objectName);
  }

  /**
   * 删除指定对象。
   */
  async removeObject(bucketName: string, objectName: string) {
    return this.client.removeObject(bucketName, objectName);
  }

  /**
   * 生成预签名上传地址。
   */
  async createPresignedUploadUrl(bucketName: string, objectName: string, expires = 60 * 5) {
    return this.client.presignedPutObject(bucketName, objectName, expires);
  }

  /**
   * 生成预签名下载地址。
   */
  async createPresignedDownloadUrl(bucketName: string, objectName: string, expires = 60 * 5) {
    return this.client.presignedGetObject(bucketName, objectName, expires);
  }
}
