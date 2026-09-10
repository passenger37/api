export class PostReactionAddedEvent {
  constructor(
    public readonly postId: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly createdAt: Date,
  ) {}
}