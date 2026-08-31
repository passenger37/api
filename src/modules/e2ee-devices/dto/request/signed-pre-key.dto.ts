import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class SignedPreKeyDto {
  @IsInt()
  @Min(0)
  signedPreKeyId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  publicKey: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  signature: string;
}
