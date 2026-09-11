# Comment Authorization

## Authorization Matrix

| Action | Personal Post | Community Post | Channel Post |
|---|---|---|---|
| Create comment | Post visible to user, not blocked | Community member, post not locked | Server member with channel access, post not locked |
| Edit own comment | Author only, within edit window | Author only, within edit window | Author only, within edit window |
| Delete own comment | Author only | Author only | Author only |
| Remove comment (mod) | N/A | Community moderator/admin | Server moderator |
| View comments | Same as post visibility | Community members (or public) | Server members with channel access |
| React to comment | Same as post visibility | Community members | Server members with channel access |

## Personal Post Authorization Flow

```
Request → Post exists? → Post visible? → User not blocked by author? → Allowed
```

Visibility modes (from PostVisibility enum): PUBLIC, FOLLOWERS, FRIENDS, COMMUNITY, SERVER, PRIVATE, CUSTOM

## Community Post Authorization Flow

```
Request → Post exists? → Community member? → Post not locked? → Role allows commenting? → Allowed
```

- Community membership required for COMMUNITY_MEMBERS visibility
- Community moderators can remove comments
- Community admins can lock comments on posts

## Channel Post Authorization Flow

```
Request → Post exists? → Server member? → Channel access? → Channel permissions? → Allowed
```

- Server membership required
- Channel permission overwrite checked
- Private channels: only members with channel access

## Block Handling

- If author is blocked by post author → cannot comment
- If post author is blocked by comment author → cannot see comments (filtered)
- Existing `UserSocialRepository.existsBlock()` used for checks

## Locked Posts

- `Post.status = LOCKED` or `CommunityPost.lockedAt != null` → new comments/replies rejected
- Existing comments remain visible
- Only moderators/owners can lock/unlock
