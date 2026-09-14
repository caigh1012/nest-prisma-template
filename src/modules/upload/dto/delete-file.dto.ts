import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteFileDto {
  @IsString({ message: 'objectName 必须是字符串' })
  @IsNotEmpty({ message: 'objectName 不能为空' })
  @MaxLength(512, { message: 'objectName 长度不能超过 512 个字符' })
  objectName: string;
}
