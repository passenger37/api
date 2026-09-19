import { CommentReactionRepository } from './comment-reaction.repository';

describe('CommentReactionRepository', () => {
  let repository: CommentReactionRepository;
  let prisma: {
    commentReaction: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      groupBy: jest.Mock;
    };
    comment: {
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      commentReaction: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        groupBy: jest.fn(),
      },
      comment: {
        update: jest.fn(),
      },
    };
    repository = new CommentReactionRepository(prisma as any);
  });

  it('should create a new upvote', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue(null);
    prisma.commentReaction.create.mockResolvedValue({
      id: 'r1',
      commentId: 'c1',
      userId: 'u1',
      vote: 'UPVOTE',
    });

    const result = await repository.upsert('c1', 'u1', 'UPVOTE');

    expect(result.isNew).toBe(true);
    expect(result.previousVote).toBeUndefined();
    expect(prisma.commentReaction.create).toHaveBeenCalledWith({
      data: { commentId: 'c1', userId: 'u1', vote: 'UPVOTE' },
    });
  });

  it('should keep the existing reaction when the same vote is submitted', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue({
      id: 'r1',
      commentId: 'c1',
      userId: 'u1',
      vote: 'UPVOTE',
    });

    const result = await repository.upsert('c1', 'u1', 'UPVOTE');

    expect(result.isNew).toBe(false);
    expect(result.previousVote).toBeUndefined();
    expect(prisma.commentReaction.update).not.toHaveBeenCalled();
  });

  it('should switch an upvote to a downvote', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue({
      id: 'r1',
      commentId: 'c1',
      userId: 'u1',
      vote: 'UPVOTE',
    });
    prisma.commentReaction.update.mockResolvedValue({
      id: 'r1',
      commentId: 'c1',
      userId: 'u1',
      vote: 'DOWNVOTE',
    });

    const result = await repository.upsert('c1', 'u1', 'DOWNVOTE');

    expect(result.isNew).toBe(false);
    expect(result.previousVote).toBe('UPVOTE');
    expect(prisma.commentReaction.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { vote: 'DOWNVOTE' },
    });
  });

  it('should remove an existing reaction', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue({
      id: 'r1',
      commentId: 'c1',
      userId: 'u1',
      vote: 'UPVOTE',
    });
    prisma.commentReaction.delete.mockResolvedValue({
      id: 'r1',
    });

    const result = await repository.remove('c1', 'u1');

    expect(result).toBeDefined();
    expect(prisma.commentReaction.delete).toHaveBeenCalledWith({
      where: { id: 'r1' },
    });
  });

  it('should return null when removing a non-existent reaction', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue(null);

    const result = await repository.remove('c1', 'u1');

    expect(result).toBeNull();
    expect(prisma.commentReaction.delete).not.toHaveBeenCalled();
  });

  it('should return the viewers vote for a comment', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue({ vote: 'DOWNVOTE' });

    const vote = await repository.findByCommentAndUser('c1', 'u1');

    expect(vote).toBe('DOWNVOTE');
  });

  it('should return null when the viewer has no vote', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue(null);

    const vote = await repository.findByCommentAndUser('c1', 'u1');

    expect(vote).toBeNull();
  });

  it('should aggregate vote counts', async () => {
    prisma.commentReaction.groupBy.mockResolvedValue([
      { vote: 'UPVOTE', _count: { vote: 5 } },
      { vote: 'DOWNVOTE', _count: { vote: 2 } },
    ]);

    const counts = await repository.getVoteCounts('c1');

    expect(counts).toEqual({ upvotes: 5, downvotes: 2 });
  });

  it('should default to zero counts when there are no votes', async () => {
    prisma.commentReaction.groupBy.mockResolvedValue([]);

    const counts = await repository.getVoteCounts('c1');

    expect(counts).toEqual({ upvotes: 0, downvotes: 0 });
  });

  it('should update the denormalized counts on a comment', async () => {
    await repository.updateCommentCounts('c1', { upvotes: -1, downvotes: 1 });

    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        upvoteCount: { increment: -1 },
        downvoteCount: { increment: 1 },
      },
    });
  });
});
