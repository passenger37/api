# Comment Tree

## Hierarchy

Root comment: `parentCommentId = null`
Reply: `parentCommentId = <existingCommentId>`

```
Comment A (root)
├── Reply A1 (parentCommentId = A)
│   ├── Reply A1.1 (parentCommentId = A1)
│   └── Reply A1.2 (parentCommentId = A1)
├── Reply A2 (parentCommentId = A)
└── Reply A3 (parentCommentId = A)
```

## Cross-Post Attack Prevention

When creating a reply:
1. Backend fetches `parentComment` by `parentCommentId`
2. Validates `parentComment.postId === suppliedpostId`
3. If mismatch → reject with 400 Bad Request
4. Backend derives `postId` from parent if `parentCommentId` is provided (never trusts client)

## Lazy Loading

Initial load: root comments only (up to `limit`)
```
GET /posts/:postId/comments?sort=BEST&limit=20
```

On-demand: replies to a specific comment
```
GET /comments/:commentId/replies?sort=BEST&limit=20&cursor=...
```

## Pagination

Cursor-based using `(createdAt, id)` two-field cursor.
Deterministic ordering via composite sort keys.

## Deep Threads

No hard depth limit. Abuse protection via rate limiting on comment creation.
Deleted parent comments preserve their reply tree (Reddit-style `[deleted]` behavior).
