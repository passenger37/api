export interface AuthorizationPolicy<TContext = unknown> {
  can(context: TContext): Promise<boolean>;
}
