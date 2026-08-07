import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateServerCategoryRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
