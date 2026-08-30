import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum FeedFilter {
  LATEST = 'latest',
  FOLLOWING = 'following',
}

export class GetFeedQuery {
  @IsOptional()
  @IsEnum(FeedFilter)
  filter: FeedFilter = FeedFilter.LATEST;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
