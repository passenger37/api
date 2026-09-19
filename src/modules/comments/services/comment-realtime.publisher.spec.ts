import { CommentRealtimePublisher } from './comment-realtime.publisher';
import { RealtimeEventType } from '../../realtime/types/realtime.types';

describe('CommentRealtimePublisher', () => {
  let publisher: CommentRealtimePublisher;
  let pubSub: { publish: jest.Mock };

  beforeEach(() => {
    pubSub = { publish: jest.fn().mockResolvedValue(undefined) };
    publisher = new CommentRealtimePublisher(pubSub as any);
  });

  const comment = {
    id: 'c1',
    postId: 'post1',
    postType: 'PERSONAL',
    parentCommentId: null,
    content: 'hello',
    status: 'ACTIVE',
    upvoteCount: 0,
    downvoteCount: 0,
    score: 0,
    replyCount: 0,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    editedAt: null,
    deletedAt: null,
    author: {
      id: 'u1',
      username: 'user',
      displayName: 'User',
      isVerified: false,
    },
    viewer: {
      viewerVote: null,
      viewerCanEdit: true,
      viewerCanDelete: true,
      viewerCanModerate: false,
    },
  };

  it('publishes a comment:created event to the realtime bus', async () => {
    await publisher.publishCommentCreated(comment as any);

    expect(pubSub.publish).toHaveBeenCalledTimes(1);
    const [channel, event] = pubSub.publish.mock.calls[0];
    expect(channel).toBe('realtime:events');
    expect(event.type).toBe(RealtimeEventType.COMMENT_CREATED);
    expect(event.postId).toBe('post1');
    expect(event.commentId).toBe('c1');
    expect(event.comment.id).toBe('c1');
  });

  it('publishes comment:updated events', async () => {
    await publisher.publishCommentUpdated(comment as any);

    const [, event] = pubSub.publish.mock.calls[0];
    expect(event.type).toBe(RealtimeEventType.COMMENT_UPDATED);
    expect(event.commentId).toBe('c1');
  });

  it('publishes comment:deleted events with status', async () => {
    await publisher.publishCommentDeleted({
      postId: 'post1',
      postType: 'COMMUNITY',
      commentId: 'c1',
      status: 'DELETED',
    });

    const [, event] = pubSub.publish.mock.calls[0];
    expect(event.type).toBe(RealtimeEventType.COMMENT_DELETED);
    expect(event.status).toBe('DELETED');
    expect(event.postType).toBe('COMMUNITY');
  });

  it('publishes comment:reaction events with score delta', async () => {
    await publisher.publishCommentReaction({
      postId: 'post1',
      postType: 'PERSONAL',
      commentId: 'c1',
      vote: 'UPVOTE',
      scoreDelta: 1,
    });

    const [, event] = pubSub.publish.mock.calls[0];
    expect(event.type).toBe(RealtimeEventType.COMMENT_REACTION);
    expect(event.vote).toBe('UPVOTE');
    expect(event.scoreDelta).toBe(1);
  });

  it('logs an error but does not throw if publish fails', async () => {
    pubSub.publish.mockRejectedValue(new Error('redis down'));

    await expect(
      publisher.publishCommentDeleted({
        postId: 'post1',
        postType: 'PERSONAL',
        commentId: 'c1',
        status: 'REMOVED',
      }),
    ).resolves.toBeUndefined();

    expect(pubSub.publish).toHaveBeenCalledTimes(1);
  });
});
