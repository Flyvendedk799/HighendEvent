import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { bindTenantFromToken } from "./tenant.context";
import type { JwtPayload } from "../auth/password";

/**
 * Runs after guards, so `request.user` is populated by JwtAuthGuard. Binds the caller token
 * tenant into the request context when the host/header did not name one — this is what lets the
 * admin console call tenant-scoped endpoints from a platform host.
 *
 * RolesGuard has already rejected the mismatch case (token tenant vs. requested tenant), so this
 * only ever fills an empty slot.
 */
@Injectable()
export class TenantBindingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (user?.tenantId) {
      bindTenantFromToken(user.tenantId, user.tenantSlug);
    }
    return next.handle();
  }
}
