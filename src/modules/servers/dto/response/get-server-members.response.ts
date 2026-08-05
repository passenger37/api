import { ServerMemberResponse } from './server-member.response';

export class GetServerMembersResponse {
  items: ServerMemberResponse[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}
