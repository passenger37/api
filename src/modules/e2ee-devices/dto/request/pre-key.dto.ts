import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class PreKeyDto {
  @IsInt()
  @Min(0)
  preKeyId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  publicKey: string;
}
