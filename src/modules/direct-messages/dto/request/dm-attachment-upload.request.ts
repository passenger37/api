import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class DmAttachmentUploadRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(127)
  mimeType: string;

  @IsInt()
  @Min(1)
  sizeBytes: number;
}
