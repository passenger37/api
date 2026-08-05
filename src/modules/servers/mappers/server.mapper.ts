import { Server } from '@prisma/client';

import { CreateServerResponse } from '../dto/response/create-server.response';

export class ServerMapper {
  static toCreateResponse(server: Server): CreateServerResponse {
    return {
      id: server.id,
      slug: server.slug,
      name: server.name,
    };
  }
}
