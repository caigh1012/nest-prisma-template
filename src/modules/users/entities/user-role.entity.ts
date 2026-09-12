import { RoleEntity } from './role.entity.js';

export class UserRoleEntity {
  id: string;

  user_id: string;

  role_id: string;

  role: RoleEntity;
}
