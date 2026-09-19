export class PostCreatedEvent {
  constructor(
    public readonly postId: string,
    public readonly authorId: string,
    public readonly content: string | undefined,
    public readonly visibility: string,
    public readonly createdAt: Date,
  ) {}
}
