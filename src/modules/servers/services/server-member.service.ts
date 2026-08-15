import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerRoleRepository } from '../repositories/server-role.repository';
import { ServerRoleAssignmentRepository } from '../repositories/server-role-assignment.repository';

@Injectable()
export class ServerMemberService {
  constructor(
    private readonly memberRepository: ServerMemberRepository,
    private readonly roleRepository: ServerRoleRepository,
    private readonly roleAssignmentRepository: ServerRoleAssignmentRepository,
  ) {}

  async getMember(serverId: string, userId: string) {
    return this.memberRepository.findByServerAndUser(serverId, userId);
  }

  /**
   * Creates a server membership and assigns the default "Member" role so the
   * user can view the server and use its channels.
   */
  async createMemberWithDefaultRole(
    serverId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    const member = await this.memberRepository.create(
      {
        server: {
          connect: {
            id: serverId,
          },
        },

        user: {
          connect: {
            id: userId,
          },
        },
      },
      tx,
    );

    const memberRole = await this.roleRepository.findByName(
      serverId,
      'Member',
      tx,
    );

    if (memberRole) {
      const alreadyAssigned = await this.roleAssignmentRepository.exists(
        member.id,
        memberRole.id,
        tx,
      );

      if (!alreadyAssigned) {
        await this.roleAssignmentRepository.create(
          {
            member: {
              connect: {
                id: member.id,
              },
            },

            role: {
              connect: {
                id: memberRole.id,
              },
            },
          },
          tx,
        );
      }
    }

    return member;
  }
}
