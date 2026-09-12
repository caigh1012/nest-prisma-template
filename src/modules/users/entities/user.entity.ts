import { Exclude } from 'class-transformer';
import { Gender } from '../../../generated/prisma/enums.js';
import { RoleEntity } from './role.entity.js';

// const GENDER_LABEL: Record<Gender, string> = {
//   MALE: '男',
//   FEMALE: '女',
//   UNKNOWN: '未知',
// };

/**
 * 用户实体，对应 Prisma 模型 t_user
 */
export class UserEntity {
  id: string;

  username: string;

  nickname: string;

  email: string | null;

  @Exclude()
  password: string;

  // @Transform(({ value }: { value: Gender | null }) => (value ? GENDER_LABEL[value] : null))
  gender: Gender | null;

  avatarUrl: string | null;

  user_roles: RoleEntity[];
}
