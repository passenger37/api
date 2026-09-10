export class PostRepostedEvent {
  constructor(
    public readonly repostId: string,
    public readonly originalPostId: string,
    public readonly userId: string,
    public readonly createdAt: Date,
  ) {}
}