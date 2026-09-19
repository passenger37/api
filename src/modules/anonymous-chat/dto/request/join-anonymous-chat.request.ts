import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { ANONYMOUS_MAX_TOPIC_LENGTH } from '../../constants/anonymous-chat.constants';

export class JoinAnonymousQueueRequest {
  @ApiProperty({
    required: false,
    default: 'general',
    description: 'Optional chat interest topic used for the queue bucket.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(ANONYMOUS_MAX_TOPIC_LENGTH)
  topic?: string;
}

export type AnonymousQueueTopic =
  | 'general'
  | 'coding'
  | 'gaming'
  | 'music'
  | 'movies'
  | 'sports'
  | 'travel'
  | 'life'
  | 'other';

export const ANONYMOUS_QUEUE_TOPICS: readonly AnonymousQueueTopic[] = [
  'general',
  'coding',
  'gaming',
  'music',
  'movies',
  'sports',
  'travel',
  'life',
  'other',
];

export class LeaveAnonymousQueueRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}
