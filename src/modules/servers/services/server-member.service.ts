import { Injectable } from '@nestjs/common';

import { ServerMemberRepository } from '../repositories/server-member.repository';

@Injectable()
export class ServerMemberService {
  constructor(private readonly memberRepository: ServerMemberRepository) {}

  async getMember(serverId: string, userId: string) {
    return this.memberRepository.findByServerAndUser(serverId, userId);
  }
}
