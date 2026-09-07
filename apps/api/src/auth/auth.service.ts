import { randomBytes } from "node:crypto";
import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  hashPassword,
  needsRehash,
  verifyPassword,
  type AuthRole,
  type JwtPayload,
} from "./password";
import { tryGetTenantContext } from "../tenant/tenant.context";

/** How long a confirmation link stays good. */
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Whether signup requires a confirmed address before the account is usable.
 *
 * Off by default, and deliberately so: turning it on retroactively would lock
 * out every customer who registered before it existed, since their rows carry
 * `emailVerified = false`. Backfill those to true, then set
 * AUTH_EMAIL_VERIFICATION=true. Until then signup sends a welcome mail and the
 * account works immediately, which is the behaviour that shipped.
 */
function emailVerificationEnabled(): boolean {
  return process.env.AUTH_EMAIL_VERIFICATION?.trim().toLowerCase() === "true";
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationsService,
  ) {}

  async login(input: { email: string; password: string; role: AuthRole; tenantSlug?: string }) {
    const email = input.email.trim().toLowerCase();

    if (input.role === "platform") {
      const user = await this.prisma.platformUser.findUnique({ where: { email } });
      if (!user?.isActive || !verifyPassword(input.password, user.passwordHash)) {
        throw new UnauthorizedException("Invalid credentials");
      }
      await this.upgradeHash("platform", user.id, user.passwordHash, input.password);
      return this.sign({
        sub: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: "platform",
      });
    }

    const tenant = await this.resolveTenant(input.tenantSlug);

    if (input.role === "staff") {
      const user = await this.prisma.staffUser.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } },
      });
      if (!user?.isActive || !verifyPassword(input.password, user.passwordHash)) {
        throw new UnauthorizedException("Invalid credentials");
      }
      await this.upgradeHash("staff", user.id, user.passwordHash, input.password);
      await this.prisma.staffUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      return this.sign({
        sub: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: "staff",
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        staffRole: user.role,
      });
    }

    const customer = await this.prisma.customer.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (!customer?.isActive || !verifyPassword(input.password, customer.passwordHash)) {
      throw new UnauthorizedException("Invalid credentials");
    }
    // Only gates when the deployment asked for it. The message is distinct from
    // "Invalid credentials" on purpose: the password WAS right, and telling
    // someone to go and check their inbox is the whole point of the gate.
    if (emailVerificationEnabled() && !customer.emailVerified) {
      throw new UnauthorizedException(
        "Confirm your email address first — check your inbox for the link we sent",
      );
    }
    await this.upgradeHash("customer", customer.id, customer.passwordHash, input.password);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });
    return this.sign({
      sub: customer.id,
      email: customer.email,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      role: "customer",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });
  }

  /** Customer self-registration on a tenant storefront. */
  async registerCustomer(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    tenantSlug?: string;
  }) {
    const tenant = await this.resolveTenant(input.tenantSlug);
    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });

    if (existing && !existing.isGuest) {
      throw new ConflictException("An account with that email already exists");
    }

    // A guest row created during checkout is upgraded in place rather than duplicated.
    const customer = existing
      ? await this.prisma.customer.update({
          where: { id: existing.id },
          data: {
            passwordHash: hashPassword(input.password),
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone ?? existing.phone,
            isGuest: false,
            lastLoginAt: new Date(),
          },
        })
      : await this.prisma.customer.create({
          data: {
            tenantId: tenant.id,
            email,
            passwordHash: hashPassword(input.password),
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            lastLoginAt: new Date(),
          },
        });

    // Signup used to complete in silence: the account was created and the token
    // returned, and nothing was ever emailed. Which mail goes out depends on
    // whether this deployment gates accounts behind a confirmed address.
    if (emailVerificationEnabled()) {
      const token = randomBytes(32).toString("hex");
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          emailVerified: false,
          verifyToken: token,
          verifyTokenExpiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
        },
      });
      await this.sendVerifyEmail(customer, tenant, token);
    } else {
      await this.sendWelcomeEmail(customer, tenant);
    }

    return this.sign({
      sub: customer.id,
      email: customer.email,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      role: "customer",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });
  }

  /**
   * Confirms an address and spends the token.
   *
   * The lookup is by token alone — it is 256 bits of randomness and unique, so
   * it identifies the customer on its own, and asking for the email as well
   * would only turn a working link into a broken one for anyone whose mail
   * client rewrote the query string.
   */
  async verifyEmail(token: string) {
    const customer = await this.prisma.customer.findUnique({ where: { verifyToken: token } });
    if (!customer) throw new BadRequestException("That confirmation link is not valid");

    if (customer.verifyTokenExpiresAt && customer.verifyTokenExpiresAt < new Date()) {
      throw new BadRequestException("That confirmation link has expired — request a new one");
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { emailVerified: true, verifyToken: null, verifyTokenExpiresAt: null },
    });
    return { verified: true };
  }

  /**
   * Issues a fresh confirmation link.
   *
   * Always answers the same way, whether or not the address exists or is already
   * confirmed: the endpoint is unauthenticated, and a truthful "no such account"
   * would turn it into a way to test which addresses are registered.
   */
  async resendVerifyEmail(input: { email: string; tenantSlug?: string }) {
    const acknowledged = { sent: true } as const;
    if (!emailVerificationEnabled()) return acknowledged;

    const tenant = await this.resolveTenant(input.tenantSlug);
    const customer = await this.prisma.customer.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: input.email.trim().toLowerCase() } },
    });
    if (!customer || customer.emailVerified || customer.isGuest) return acknowledged;

    const token = randomBytes(32).toString("hex");
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { verifyToken: token, verifyTokenExpiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) },
    });
    await this.sendVerifyEmail(customer, tenant, token);
    return acknowledged;
  }

  /**
   * Queues a message, never letting the queue break the request that caused it.
   *
   * A customer who signed up successfully must not see an error because Redis
   * blinked, so this mirrors NotificationsService's own contract: log and move
   * on. The account exists either way, and for the verification flow the resend
   * endpoint is the recovery path.
   */
  private async queueQuietly(job: Parameters<NotificationsService["enqueue"]>[0]) {
    try {
      const result = await this.notifications.enqueue(job);
      if (!result.queued) {
        this.logger.warn(`Signup email not queued for ${job.to}: ${result.reason ?? "unknown"}`);
      }
    } catch (err) {
      this.logger.warn(
        `Signup email not queued for ${job.to}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private storefrontOrigin(tenantSlug: string): string {
    const base = process.env.STOREFRONT_URL?.trim().replace(/\/+$/, "");
    if (base) return base;
    // Falls back to the tenant's own subdomain on the platform's wildcard host.
    const root = process.env.PUBLIC_ROOT_DOMAIN?.trim() || "alarent.app";
    return `https://${tenantSlug}.${root}`;
  }

  private async sendWelcomeEmail(
    customer: { id: string; email: string; firstName: string },
    tenant: { id: string; name: string; slug: string },
  ) {
    await this.queueQuietly({
      to: customer.email,
      tenantId: tenant.id,
      template: "customer_welcome",
      vars: {
        customerName: customer.firstName,
        storeName: tenant.name,
        accountUrl: `${this.storefrontOrigin(tenant.slug)}/account`,
      },
    });
  }

  private async sendVerifyEmail(
    customer: { id: string; email: string; firstName: string },
    tenant: { id: string; name: string; slug: string },
    token: string,
  ) {
    await this.queueQuietly({
      to: customer.email,
      tenantId: tenant.id,
      template: "customer_verify",
      vars: {
        customerName: customer.firstName,
        storeName: tenant.name,
        verifyUrl: `${this.storefrontOrigin(tenant.slug)}/auth/verify?token=${token}`,
        expiresHours: String(Math.round(VERIFY_TOKEN_TTL_MS / 3_600_000)),
      },
    });
  }

  /** Re-reads the principal so a deactivated user cannot ride a still-valid token. */
  async me(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.role === "platform") {
      const user = await this.prisma.platformUser.findUnique({ where: { id: payload.sub } });
      if (!user?.isActive) throw new UnauthorizedException("Account is no longer active");
      return { sub: user.id, email: user.email, name: user.name ?? undefined, role: "platform" };
    }

    if (payload.role === "staff") {
      const user = await this.prisma.staffUser.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });
      if (!user?.isActive || user.tenant.isSuspended) {
        throw new UnauthorizedException("Account is no longer active");
      }
      return {
        sub: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: "staff",
        tenantId: user.tenantId,
        tenantSlug: user.tenant.slug,
        staffRole: user.role,
      };
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });
    if (!customer?.isActive || customer.tenant.isSuspended) {
      throw new UnauthorizedException("Account is no longer active");
    }
    return {
      sub: customer.id,
      email: customer.email,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      role: "customer",
      tenantId: customer.tenantId,
      tenantSlug: customer.tenant.slug,
    };
  }

  async changePassword(payload: JwtPayload, current: string, next: string) {
    if (payload.role === "platform") {
      const user = await this.prisma.platformUser.findUnique({ where: { id: payload.sub } });
      if (!verifyPassword(current, user?.passwordHash)) {
        throw new UnauthorizedException("Current password is incorrect");
      }
      await this.prisma.platformUser.update({
        where: { id: payload.sub },
        data: { passwordHash: hashPassword(next) },
      });
      return { ok: true };
    }

    if (payload.role === "staff") {
      const user = await this.prisma.staffUser.findUnique({ where: { id: payload.sub } });
      if (!verifyPassword(current, user?.passwordHash)) {
        throw new UnauthorizedException("Current password is incorrect");
      }
      await this.prisma.staffUser.update({
        where: { id: payload.sub },
        data: { passwordHash: hashPassword(next) },
      });
      return { ok: true };
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: payload.sub } });
    if (!verifyPassword(current, customer?.passwordHash)) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    await this.prisma.customer.update({
      where: { id: payload.sub },
      data: { passwordHash: hashPassword(next) },
    });
    return { ok: true };
  }

  private async resolveTenant(tenantSlug?: string) {
    const slug = tenantSlug?.trim().toLowerCase();
    if (slug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
      if (!tenant) throw new BadRequestException(`Tenant ${slug} not found`);
      if (tenant.isSuspended) throw new UnauthorizedException("This store is suspended");
      return tenant;
    }

    const ctx = tryGetTenantContext();
    if (!ctx?.tenantId) {
      throw new BadRequestException("tenantSlug or X-Tenant-Slug required");
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { id: ctx.tenantId } });
    if (!tenant) throw new BadRequestException("Tenant not found");
    return tenant;
  }

  /** Transparently migrates legacy sha256 hashes to scrypt on successful login. */
  private async upgradeHash(
    kind: AuthRole,
    id: string,
    stored: string | null | undefined,
    password: string,
  ) {
    if (!needsRehash(stored)) return;
    const passwordHash = hashPassword(password);
    if (kind === "platform") {
      await this.prisma.platformUser.update({ where: { id }, data: { passwordHash } });
    } else if (kind === "staff") {
      await this.prisma.staffUser.update({ where: { id }, data: { passwordHash } });
    } else {
      await this.prisma.customer.update({ where: { id }, data: { passwordHash } });
    }
  }

  private sign(payload: JwtPayload) {
    return {
      accessToken: this.jwt.sign(payload),
      expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
      user: payload,
    };
  }
}
