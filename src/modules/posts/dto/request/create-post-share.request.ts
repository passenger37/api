import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShareDestinationType } from '../../domain/types/share-destination.type';

export class CreatePostShareDto {
  @ApiProperty({ enum: ShareDestinationType })
  @IsEnum(ShareDestinationType)
  destinationType: ShareDestinationType;

  @ApiPropertyOptional({
    description: 'Required for DM and SERVER_CHANNEL destinations',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  destinationId?: string;

  @ApiPropertyOptional({ description: 'Idempotency key for deduplication' })
  @IsOptional()
  @IsString()
  @IsUUID()
  clientRequestId?: string;
}
