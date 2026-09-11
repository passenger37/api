import { CommentNotificationPublisher } from './comment-notification.publisher';
import { NotificationType, NotificationEntityType } from '@prisma/client';

describe('CommentNotificationPublisher', () => {
  let publisher: CommentNotificationPublisher;
  let pubSub: { publish: jest.Mock };

  beforeEach(() => {
    pubSub = { publish: jest.fn().mockResolvedValue(undefined) };
    publisher = new CommentNotificationPublisher(pubSub as any);
  });

  it('publishes a COMMENT_ON_POST event with generated eventId', async () => {
    await publisher.publishCommentOnPost({
      postId: 'post1',
      postType: 'PERSONAL',
      commentId: 'c1',
      postAuthorId: 'author',
      actorUserId: 'commenter',
    });

    expect(pubSub.publish).toHaveBeenCalledTimes(1);
    const [channel, event] = pubSub.publish.mock.calls[0];
    expect(channel).toBe('notifications:domain-events');
    expect(event.recipientUserId).toBe('author');
    expect(event.actorUserId).toBe('commenter');
    expect(event.type).toBe(NotificationType.COMMENT_ON_POST);
    expect(event.entityType).toBe(NotificationEntityType.COMMENT);
    expect(event.entityId).toBe('c1');
    expect(typeof event.eventId).toBe('string');
  });

  it('skips the notification when the author comments on their own post', async () => {
    await publisher.publishCommentOnPost({
      postId: 'post1',
      postType: 'PERSONAL',
      commentId: 'c1',
      postAuthorId: 'sameUser',
      actorUserId: 'sameUser',
    });

    expect(pubSub.publish).not.toHaveBeenCalled();
  });

  it('publishes a COMMENT_REPLY event for replies', async () => {
    await publisher.publishCommentReply({
      postId: 'post1',
      postType: 'COMMUNITY',
      parentCommentId: 'p1',
      commentId: 'c1',
      parentAuthorId: 'replyTo',
      actorUserId: 'replier',
    });

    expect(pubSub.publish).toHaveBeenCalledTimes(1);
    const [, event] = pubSub.publish.mock.calls[0];
    expect(event.type).toBe(NotificationType.COMMENT_REPLY);
    expect(event.recipientUserId).toBe('replyTo');
    expect(event.entityId).toBe('c1');
  });

  it('skips reply notification when replying to self', async () => {
    await publisher.publishCommentReply({
      postId: 'post1',
      postType: 'PERSONAL',
      parentCommentId: 'p1',
      commentId: 'c1',
      parentAuthorId: 'self',
      actorUserId: 'self',
    });

    expect(pubSub.publish).not.toHaveBeenCalled();
  });

  it('publishes a COMMENT_REACTION event with the vote type', async () => {
    await publisher.publishCommentReaction({
      commentId: 'c1',
      commentAuthorId: 'author',
      actorUserId: 'voter',
      vote: 'DOWNVOTE',
    });

    expect(pubSub.publish).toHaveBeenCalledTimes(1);
    const [, event] = pubSub.publish.mock.calls[0];
    expect(event.type).toBe(NotificationType.COMMENT_REACTION);
    expect(event.recipientUserId).toBe('author');
    expect(event.payload.vote).toBe('DOWNVOTE');
  });

  it('skips reaction notification when reacting to own comment', async () => {
    await publisher.publishCommentReaction({
      commentId: 'c1',
      commentAuthorId: 'self',
      actorUserId: 'self',
      vote: 'UPVOTE',
    });

    expect(pubSub.publish).not.toHaveBeenCalled();
  });

  it('publishes separate COMMENT_MENTION events per recipient', async () => {
    await publisher.publishCommentMentions({
      commentId: 'c1',
      mentionedUserIds: ['user1', 'user2'],
      actorUserId: 'actor',
    });

    expect(pubSub.publish).toHaveBeenCalledTimes(2);
    const recipients = pubSub.publish.mock.calls.map(([, e]) => e.recipientUserId);
    expect(recipients).toEqual(['user1', 'user2']);
  });

  it('removes the actor from mentioned recipients', async () => {
    await publisher.publishCommentMentions({
      commentId: 'c1',
      mentionedUserIds: ['self', 'other'],
      actorUserId: 'self',
    });

    expect(pubSub.publish).toHaveBeenCalledTimes(1);
    const [, event] = pubSub.publish.mock.calls[0];
    expect(event.recipientUserId).toBe('other');
    expect(event.type).toBe(NotificationType.COMMENT_MENTION);
  });

  it('does not publish if no unique non-actor recipients', async () => {
    await publisher.publishCommentMentions({
      commentId: 'c1',
      mentionedUserIds: ['self'],
      actorUserId: 'self',
    });

    expect(pubSub.publish).not.toHaveBeenCalled();
  });

  it('logs the error but does not throw if publish fails', async () => {
    pubSub.publish.mockRejectedValue(new Error('redis down'));

    await expect(
      publisher.publishCommentOnPost({
        postId: 'post1',
        postType: 'CHANNEL',
        commentId: 'c1',
        postAuthorId: 'author',
        actorUserId: 'commenter',
      }),
    ).resolves.toBeUndefined();

    expect(pubSub.publish).toHaveBeenCalledTimes(1);
  });
});