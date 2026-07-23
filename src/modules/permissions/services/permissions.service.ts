import { Injectable } from '@nestjs/common';

@Injectable()
export class PermissionsService {
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    /**
     * Temporary implementation.
     *
     * Database support
     * arrives in a later lecture.
     */

    return true;
  }
}
