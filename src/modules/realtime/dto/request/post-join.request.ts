import { IsString } from 'class-validator';

export class PostJoinRequest {
  @IsString()
  postId!: string;
}
