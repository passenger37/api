import { Server } from '@prisma/client';

export class SearchServersResponse {
  items: Server[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}
