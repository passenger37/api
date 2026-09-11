import { PostShare, ShareDestinationType } from '@prisma/client';

export interface CreatePostShareResponse {
  shareId: string;
  postId: string;
  destinationType: ShareDestinationType;
}

export class PostShareMapper {
  static toCreateResponse(share: PostShare): CreatePostShareResponse {
    return {
      shareId: share.id,
      postId: share.postId,
      destinationType: share.destinationType,
    };
  }
}