import { RoleType } from '../../../generated/prisma/enums.js';

export class RoleEntity {
  id: string;

  role_id: string;

  role_label: string;

  role_type: RoleType;
}
