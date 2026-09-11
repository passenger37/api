import { CommentRepository } from './comment.repository';
import { COMMENT_SORT, encodeCommentCursor } from '../constants/comment.constants';

describe('CommentRepository', () => {
  let repository: CommentRepository;
  let prisma: {
    comment: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      comment: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    repository = new CommentRepository(prisma as any);
  });

  it('should create a root comment', async () => {
    prisma.comment.create.mockResolvedValue({ id: 'c1' });

    await repository.create({
      postId: 'p1',
      postType: 'PERSONAL',
      authorId: 'u1',
      content: 'hello',
    });

    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        postId: 'p1',
        postType: 'PERSONAL',
        authorId: 'u1',
        content: 'hello',
        parentCommentId: undefined,
      },
    });
  });

  it('should find a comment by id', async () => {
    await repository.findById('c1');

    expect(prisma.comment.findUnique).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('should list root comments with the default sort and no cursor', async () => {
    prisma.comment.findMany.mockResolvedValue([]);

    await repository.listRootComments('p1', 'PERSONAL', 20, COMMENT_SORT.BEST);

    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          postId: 'p1',
          postType: 'PERSONAL',
          parentCommentId: null,
          status: { not: 'REMOVED' },
        },
        take: 20,
      }),
    );
  });

  it('should apply a keyset predicate when a cursor is provided (OLD ascending)', async () => {
    prisma.comment.findMany.mockResolvedValue([]);

    const cursor = encodeCommentCursor({
      sort: COMMENT_SORT.OLD,
      upvoteCount: 0,
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
      id: 'c10',
    });

    await repository.listRootComments('p1', 'COMMUNITY', 20, COMMENT_SORT.OLD, cursor);

    const call = prisma.comment.findMany.mock.calls[0][0];
    expect(call.where.parentCommentId).toBeNull();
    expect(call.where.OR).toBeDefined();
    expect(call.orderBy).toEqual([
      { createdAt: 'asc' },
      { id: 'asc' },
    ]);
    // Ascending sort continues with rows strictly after the cursor.
    expect(call.where.OR[0].AND[0]).toEqual({ createdAt: { gt: new Date('2026-09-11T00:00:00.000Z') } });
  });

  it('should apply a keyset predicate when a cursor is provided (NEW descending)', async () => {
    prisma.comment.findMany.mockResolvedValue([]);

    const cursor = encodeCommentCursor({
      sort: COMMENT_SORT.NEW,
      upvoteCount: 0,
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
      id: 'c10',
    });

    await repository.listRootComments('p1', 'PERSONAL', 20, COMMENT_SORT.NEW, cursor);

    const call = prisma.comment.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    // Descending sort continues with rows strictly before the cursor.
    expect(call.where.OR[0].AND[0]).toEqual({ createdAt: { lt: new Date('2026-09-11T00:00:00.000Z') } });
  });

  it('should sort by NEW descending', async () => {
    prisma.comment.findMany.mockResolvedValue([]);

    await repository.listRootComments('p1', 'PERSONAL', 20, COMMENT_SORT.NEW);

    const call = prisma.comment.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('should sort by TOP using upvote count', async () => {
    prisma.comment.findMany.mockResolvedValue([]);

    await repository.listRootComments('p1', 'PERSONAL', 20, COMMENT_SORT.TOP);

    const call = prisma.comment.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual([
      { upvoteCount: 'desc' },
      { createdAt: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('should list replies by parent comment id', async () => {
    prisma.comment.findMany.mockResolvedValue([]);

    await repository.listReplies('c1', 20, COMMENT_SORT.OLD);

    const call = prisma.comment.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      parentCommentId: 'c1',
      status: { not: 'REMOVED' },
    });
  });

  it('should increment the reply count of the parent', async () => {
    await repository.incrementReplyCount('c1');

    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { replyCount: { increment: 1 } },
    });
  });

  it('should soft-delete a comment preserving the reply tree', async () => {
    await repository.softDelete('c1');

    expect(prisma.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({
          status: 'DELETED',
          version: { increment: 1 },
        }),
      }),
    );
  });

  it('should count comments by post', async () => {
    prisma.comment.count.mockResolvedValue(7);

    const count = await repository.countByPost('p1', 'PERSONAL');

    expect(count).toBe(7);
    expect(prisma.comment.count).toHaveBeenCalledWith({
      where: {
        postId: 'p1',
        postType: 'PERSONAL',
        status: { not: 'REMOVED' },
      },
    });
  });
});