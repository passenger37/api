import { UserStatus } from '@prisma/client';

import {
  serializeDirectMessage,
  serializeDirectMessageChannel,
  serializeUserSummary,
} from './dm.serializer';

describe('dm serializer', () => {
  const userA = {
    id: 'userA',
    username: 'alice',
    displayName: 'Alice',
    avatarUrl: 'https://cdn.test/alice.png',
    status: UserStatus.ACTIVE,
  };

  const userB = {
    id: 'userB',
    username: 'bob',
    displayName: 'Bob',
    avatarUrl: null,
    status: UserStatus.ACTIVE,
  };

  it('serializes a user summary', () => {
    expect(serializeUserSummary(userA as any)).toEqual({
      id: 'userA',
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: 'https://cdn.test/alice.png',
    });
  });

  it('serializes a direct message', () => {
    expect(
      serializeDirectMessage({
        id: 'm1',
        channelId: 'dm1',
        authorUserId: 'userA',
        content: 'hi',
        clientMessageId: 'client-1',
        parentMessageId: null,
        isEdited: true,
        editedAt: new Date('2026-01-02T00:00:00.000Z'),
        isDeleted: false,
        version: 2,
        messageSeq: 3,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      } as any),
    ).toEqual({
      id: 'm1',
      channelId: 'dm1',
      authorUserId: 'userA',
      content: 'hi',
      clientMessageId: 'client-1',
      parentMessageId: null,
      isEdited: true,
      editedAt: '2026-01-02T00:00:00.000Z',
      isDeleted: false,
      version: 2,
      messageSeq: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('maps the partner opposite the viewer', () => {
    const channel = {
      id: 'dm1',
      userAId: 'userA',
      userBId: 'userB',
      lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      userA,
      userB,
    };

    expect(serializeDirectMessageChannel(channel as any, 'userA')).toEqual({
      id: 'dm1',
      partner: {
        id: 'userB',
        username: 'bob',
        displayName: 'Bob',
        avatarUrl: null,
      },
      lastMessageAt: '2026-01-01T00:00:00.000Z',
      unreadCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      settings: {
        isMuted: false,
        mutedAt: null,
        isArchived: false,
        archivedAt: null,
        isHidden: false,
        hiddenAt: null,
        isPinned: false,
        pinnedAt: null,
      },
    });
  });

  it('surfaces the viewer unread count from read state', () => {
    const channel = {
      id: 'dm1',
      userAId: 'userB',
      userBId: 'userA',
      lastMessageAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      userA: userB,
      userB: userA,
    };

    expect(
      serializeDirectMessageChannel(channel as any, 'userA', {
        id: 'rs1',
        unreadCount: 4,
      } as any),
    ).toEqual(
      expect.objectContaining({
        partner: {
          id: 'userB',
          username: 'bob',
          displayName: 'Bob',
          avatarUrl: null,
        },
        lastMessageAt: null,
        unreadCount: 4,
      }),
    );
  });
});
