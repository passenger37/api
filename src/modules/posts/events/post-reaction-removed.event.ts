export class PostReactionRemovedEvent {
  constructor(
    public readonly postId: string,
    public readonly userId: string,
    public readonly removedAt: Date,
  ) {}
}