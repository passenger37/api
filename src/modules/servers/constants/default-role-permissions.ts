import { ServerPermission } from '@prisma/client';

export const DEFAULT_ROLE_PERMISSIONS = {
  Owner: [ServerPermission.ADMINISTRATOR],

  Admin: [
    ServerPermission.SERVER_UPDATE,

    ServerPermission.INVITE_CREATE,

    ServerPermission.CATEGORY_CREATE,
    ServerPermission.CATEGORY_UPDATE,
    ServerPermission.CATEGORY_DELETE,

    ServerPermission.CHANNEL_CREATE,
    ServerPermission.CHANNEL_UPDATE,
    ServerPermission.CHANNEL_DELETE,

    ServerPermission.ROLE_CREATE,
    ServerPermission.ROLE_UPDATE,
    ServerPermission.ROLE_DELETE,
    ServerPermission.ROLE_ASSIGN,

    ServerPermission.MEMBER_KICK,
    ServerPermission.MEMBER_BAN,
    ServerPermission.MEMBER_TIMEOUT,

    ServerPermission.MESSAGE_DELETE,
    ServerPermission.MESSAGE_PIN,

    ServerPermission.AUDIT_LOG_VIEW,
  ],

  Moderator: [
    ServerPermission.MEMBER_KICK,
    ServerPermission.MEMBER_TIMEOUT,

    ServerPermission.MESSAGE_DELETE,
    ServerPermission.MESSAGE_PIN,
    ServerPermission.MANAGE_MESSAGES,
  ],

  Member: [
    ServerPermission.SERVER_VIEW,
    ServerPermission.CHANNEL_VIEW,
    ServerPermission.MESSAGE_SEND,
    ServerPermission.MESSAGE_UPDATE,
    ServerPermission.INVITE_CREATE,
  ],
} as const;
