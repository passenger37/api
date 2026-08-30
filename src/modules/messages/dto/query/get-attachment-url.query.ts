import { IsIn, IsOptional } from 'class-validator';

export class GetAttachmentUrlQuery {
  @IsOptional()
  @IsIn(['inline', 'attachment'])
  disposition?: 'inline' | 'attachment';
}
