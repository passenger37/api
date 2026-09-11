export type ChannelType = 'TEXT' | 'VOICE' | 'VIDEO' | 'ANNOUNCEMENT' | 'FORUM' | 'STAGE';

export interface ChannelDefinition {
  name: string;
  type: ChannelType;
  topic?: string;
}

export interface CategoryDefinition {
  name: string;
  channels: ChannelDefinition[];
}

export interface ServerStructure {
  categories: CategoryDefinition[];
}
