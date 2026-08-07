import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateServerCategoryRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
