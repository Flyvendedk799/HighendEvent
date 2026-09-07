import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { tap } from "rxjs";
import type { Observable } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import { tryGetTenantContext } from "../tenant/tenant.context";
import type { JwtPayload } from "../auth/password";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Routes whose bodies carry secrets. The action is still recorded; the body is not.
 */
const SENSITIVE = [/\/auth\//, /password/i, /\/webhooks\/stripe/];

/** Body fields never worth keeping, whatever the route. */
const REDACTED_KEYS = new Set([
  "password",
  "ownerPassword",
  "currentPassword",
  "newPassword",
  "accessToken",
  "secret",
  "keyHash",
]);

/**
 * Records who changed what.
 *
 * Only successful mutations by an identified principal are written, and only a redacted
 * summary of the body — an audit log that stores card details or passwords is a liability, not
 * a control. Failures to write are logged and swallowed: auditing must never break the request
 * it is describing.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload;
      method?: string;
      originalUrl?: string;
      url?: string;
      path?: string;
      body?: unknown;
      params?: Record<string, string>;
    }>();

    const method = (request.method ?? "GET").toUpperCase();
    const user = request.user;

    if (READ_METHODS.has(method) || !user) {
      return next.handle();
    }

    const path = request.path ?? request.originalUrl ?? request.url ?? "";
    const tenantId = tryGetTenantContext()?.tenantId ?? user.tenantId ?? null;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.record({ user, method, path, tenantId, body: request.body, params: request.params });
        },
      }),
    );
  }

  private async record(input: {
    user: JwtPayload;
    method: string;
    path: string;
    tenantId: string | null;
    body: unknown;
    params?: Record<string, string>;
  }) {
    try {
      const sensitive = SENSITIVE.some((pattern) => pattern.test(input.path));

      await this.prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorType:
            input.user.role === "platform"
              ? "PLATFORM"
              : input.user.role === "staff"
                ? "STAFF"
                : "CUSTOMER",
          actorId: input.user.sub,
          action: `${input.method} ${normalisePath(input.path)}`,
          entityType: entityTypeFrom(input.path),
          entityId: input.params?.id ?? null,
          meta: {
            actorEmail: input.user.email,
            ...(sensitive ? { redacted: true } : { body: redact(input.body) }),
          },
        },
      });
    } catch (err) {
      this.logger.warn(
        `Could not write audit entry: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

/** Collapses ids out of the path so entries group by route, not by row. */
function normalisePath(path: string): string {
  return path
    .replace(/\/c[a-z0-9]{20,}/g, "/:id")
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id");
}

function entityTypeFrom(path: string): string | null {
  const segment = path.split("/").filter(Boolean)[0];
  if (!segment) return null;
  return segment.replace(/-/g, "_");
}

function redact(body: unknown): unknown {
  if (!body || typeof body !== "object") return body ?? null;
  if (Array.isArray(body)) return body.slice(0, 20).map(redact);

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(key)) {
      out[key] = "[redacted]";
    } else if (value && typeof value === "object") {
      out[key] = redact(value);
    } else if (typeof value === "string" && value.length > 500) {
      // Long bodies (CMS blocks, email HTML) are summarised rather than duplicated.
      out[key] = `[${value.length} characters]`;
    } else {
      out[key] = value;
    }
  }
  return out;
}
