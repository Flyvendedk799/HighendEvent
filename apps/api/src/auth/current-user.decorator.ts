import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "./password";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return request.user;
  },
);
