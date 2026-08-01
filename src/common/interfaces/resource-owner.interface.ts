export interface ResourceOwnerOptions {
  /**
   * Route parameter containing owner id
   *
   * Example:
   * /users/:userId
   * /posts/:authorId
   */
  param: string;

  /**
   * Allow admins to bypass ownership check
   */
  allowAdmins?: boolean;
}
