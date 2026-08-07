import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';

class CategoryPositionDto {
  @IsString()
  categoryId: string;

  @IsInt()
  position: number;
}

export class ReorderServerCategoriesRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryPositionDto)
  categories: CategoryPositionDto[];
}
