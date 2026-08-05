export class ServerMemberResponse {
  id: string;

  nickname?: string | null;

  joinedAt: Date;

  user: {
    id: string;

    username: string;

    displayName: string | null;

    avatarUrl: string | null;
  };
}
