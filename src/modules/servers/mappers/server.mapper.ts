import { Server } from '@prisma/client';

import { CreateServerResponse } from '../dto/response/create-server.response';
import { UpdateServerResponse } from '../dto/response/update-server.response';

export class ServerMapper {
  static toCreateResponse(server: Server): CreateServerResponse {
    return {
      id: server.id,
      slug: server.slug,
      name: server.name,
    };
  }

  static toUpdateResponse(server: Server): UpdateServerResponse {
    return {
      id: server.id,
      slug: server.slug,
      name: server.name,
      description: server.description,
      visibility: server.visibility,
    };
  }
}
