# Comment API

## Endpoints

### Create Root Comment
```
POST /posts/:postId/comments
Body: { content: string }
Response: CommentResponse (201)
```

### Create Reply
```
POST /comments/:commentId/replies
Body: { content: string }
Response: CommentResponse (201)
```

### List Root Comments
```
GET /posts/:postId/comments?sort=BEST&limit=20&cursor=...
Response: { items: CommentResponse[], nextCursor: string | null }
```

### List Replies
```
GET /comments/:commentId/replies?sort=BEST&limit=20&cursor=...
Response: { items: CommentResponse[], nextCursor: string | null }
```

### Edit Comment
```
PATCH /comments/:commentId
Body: { content: string }
Response: CommentResponse (200)
```

### Delete Comment
```
DELETE /comments/:commentId
Response: 204 No Content
```

### React to Comment
```
POST /comments/:commentId/reactions
Body: { type: VoteType }
Response: CommentReactionResponse (201)

DELETE /comments/:commentId/reactions
Response: 204 No Content
```

## CommentResponse Projection

```json
{
  "id": "cuid",
  "content": "...",
  "status": "ACTIVE|EDITED|DELETED|REMOVED",
  "author": { "id": "...", "username": "...", "displayName": "...", "avatarUrl": "..." },
  "postId": "...",
  "postType": "PERSONAL|COMMUNITY|CHANNEL",
  "parentCommentId": null,
  "replyCount": 5,
  "score": 42,
  "upvoteCount": 45,
  "downvoteCount": 3,
  "viewerState": {
    "viewerVote": "UPVOTE|null",
    "viewerCanEdit": false,
    "viewerCanDelete": false,
    "viewerCanModerate": false
  },
  "createdAt": "2026-09-11T...",
  "updatedAt": "2026-09-11T...",
  "editedAt": null,
  "deletedAt": null
}
```

## Errors

| Code | Description |
|---|---|
| 400 | Invalid content, cross-post reply attempt |
| 401 | Not authenticated |
| 403 | Post not visible, locked post, not community member |
| 404 | Post or comment not found |
| 409 | Duplicate reaction |
| 429 | Rate limit exceeded |
