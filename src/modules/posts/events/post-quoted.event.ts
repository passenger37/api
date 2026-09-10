export class PostQuotedEvent {
  constructor(
    public readonly quotePostId: string,
    public readonly quotedPostId: string,
    public readonly userId: string,
    public readonly createdAt: Date,
  ) {}
}