import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Gender } from '../../../generated/prisma/enums.js';

export class CreateUserDto {
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MaxLength(20, { message: '用户名长度不能超过20个字符' })
  username: string;

  @IsString({ message: '昵称必须是字符串' })
  @IsNotEmpty({ message: '昵称不能为空' })
  @MaxLength(12, { message: '昵称长度不能超过12个字符' })
  nickname: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255, { message: '邮箱长度不能超过255个字符' })
  email?: string;

  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MaxLength(16, { message: '密码长度不能超过16个字符' })
  password: string;

  @IsOptional()
  @IsEnum(Gender, { message: '性别只能是 MALE、FEMALE 或 UNKNOWN' })
  gender?: Gender;

  @IsOptional()
  @IsString({ message: '头像地址必须是字符串' })
  avatarUrl?: string;
}
