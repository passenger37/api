import { IsString, IsOptional, MaxLength } from 'class-validator';

export class EncryptRequestDto {
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsString()
  @MaxLength(10000)
  plaintext: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  associatedData?: string;
}

export class DecryptRequestDto {
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsString()
  @MaxLength(20000)
  ciphertext: string;

  @IsString()
  @MaxLength(5000)
  header: string; // JSON stringified: { dhPublic, messageNumber, previousChainLength }

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  associatedData?: string;
}

export class RatchetStepRequestDto {
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsString()
  @MaxLength(5000)
  remoteDhPublic: string;
}