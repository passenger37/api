import { PrismaService } from '../../core/database/prisma.service';

/**
 * Minimal, realistic fixture graph used by the Database Integration Tests.
 * A single owner creates a server; a second user joins as a member; the owner
 * opens a text channel. The returned IDs feed the repository-level specs.
 */
export interface DbFixture {
  ownerUserId: string;
  memberUserId: string;
  serverId: string;
  channelId: string;
  ownerMemberId: string;
  memberMemberId: string;
}

/** Creates an additional text channel on the fixture server; returns its id. */
export async function createChannel(
  prisma: PrismaService,
  fixture: DbFixture,
): Promise<string> {
  const channel = await prisma.serverChannel.create({
    data: {
      serverId: fixture.serverId,
      createdById: fixture.ownerUserId,
      name: `channel-${crypto.randomUUID().slice(0, 6)}`,
      type: 'TEXT',
      position: Math.floor(Math.random() * 10_000),
    },
  });
  return channel.id;
}

/** Creates a standalone server (with the owner as a member) for isolation. */
export async function createServer(
  prisma: PrismaService,
  fixture: Pick<DbFixture, 'ownerUserId'>,
): Promise<{ serverId: string; channelId: string; memberId: string }> {
  const server = await prisma.server.create({
    data: {
      name: `Standalone ${crypto.randomUUID().slice(0, 6)}`,
      slug: `standalone-${crypto.randomUUID().slice(0, 8)}`,
      ownerId: fixture.ownerUserId,
    },
  });
  const member = await prisma.serverMember.create({
    data: { serverId: server.id, userId: fixture.ownerUserId },
  });
  const channel = await prisma.serverChannel.create({
    data: {
      serverId: server.id,
      createdById: fixture.ownerUserId,
      name: `sc-${crypto.randomUUID().slice(0, 6)}`,
      type: 'TEXT',
      position: 0,
    },
  });
  return { serverId: server.id, channelId: channel.id, memberId: member.id };
}

export async function seedDbFixture(prisma: PrismaService): Promise<DbFixture> {
  const ownerUser = await prisma.user.create({
    data: {
      email: `owner-${crypto.randomUUID()}@nexus.test`,
      username: `owner-${crypto.randomUUID().slice(0, 8)}`,
      passwordHash: 'hashed',
      displayName: 'Owner',
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: `member-${crypto.randomUUID()}@nexus.test`,
      username: `member-${crypto.randomUUID().slice(0, 8)}`,
      passwordHash: 'hashed',
      displayName: 'Member',
    },
  });

  const server = await prisma.server.create({
    data: {
      name: 'Integration Server',
      slug: `int-server-${crypto.randomUUID().slice(0, 8)}`,
      ownerId: ownerUser.id,
    },
  });

  const ownerMember = await prisma.serverMember.create({
    data: { serverId: server.id, userId: ownerUser.id },
  });

  const memberMember = await prisma.serverMember.create({
    data: { serverId: server.id, userId: memberUser.id },
  });

  const channel = await prisma.serverChannel.create({
    data: {
      serverId: server.id,
      createdById: ownerUser.id,
      name: `general-${crypto.randomUUID().slice(0, 6)}`,
      type: 'TEXT',
      position: 0,
    },
  });

  return {
    ownerUserId: ownerUser.id,
    memberUserId: memberUser.id,
    serverId: server.id,
    channelId: channel.id,
    ownerMemberId: ownerMember.id,
    memberMemberId: memberMember.id,
  };
}

export interface ChannelMessageEntry {
  id: string;
  messageSeq: number;
}

/**
 * Creates a channel message using the same field set the message repository
 * writes (serverId, channelId, authorMemberId, messageSeq are all required).
 */
export async function createChannelMessage(
  prisma: PrismaService,
  fixture: DbFixture,
  authorMemberId: string,
  content: string,
  messageSeq: number,
  clientMessageId?: string,
  channelId?: string,
): Promise<ChannelMessageEntry> {
  const message = await prisma.channelMessage.create({
    data: {
      content,
      serverId: fixture.serverId,
      channelId: channelId ?? fixture.channelId,
      authorMemberId,
      messageSeq,
      clientMessageId,
    },
  });
  return { id: message.id, messageSeq: message.messageSeq };
}
