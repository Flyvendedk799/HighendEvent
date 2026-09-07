import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Populates `request.user` when a valid bearer token is present, and lets the request through
 * when it is not.
 *
 * Used by the storefront routes that serve both guests and signed-in customers: the cart, the
 * catalog, checkout. An invalid or expired token is treated as "no token" rather than a 401,
 * because a shopper with a stale cookie should still be able to browse and buy as a guest.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(_err: unknown, user: TUser | false): TUser | undefined {
    return user || undefined;
  }
}
