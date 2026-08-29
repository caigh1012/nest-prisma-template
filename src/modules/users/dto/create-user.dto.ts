export class CreateUserDto {
  username: string;
  nickname: string;
  email?: string;
  password: string;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  avatarUrl?: string;
}
