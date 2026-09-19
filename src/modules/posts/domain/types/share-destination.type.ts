export enum ShareDestinationType {
  DM = 'DM',
  SERVER_CHANNEL = 'SERVER_CHANNEL',
  COPY_LINK = 'COPY_LINK',
  EXTERNAL = 'EXTERNAL',
}

export interface ShareDestination {
  type: ShareDestinationType;
  id?: string;
}
