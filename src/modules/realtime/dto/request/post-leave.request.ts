import { IsString } from 'class-validator';

export class PostLeaveRequest {
  @IsString()
  postId!: string;
}