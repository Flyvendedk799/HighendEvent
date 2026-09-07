import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import {
  hashPassword,
  needsRehash,
  verifyPassword,
  type AuthRole,
  type JwtPayload,
} from "./password";
import { tryGetTenantContext } from "../tenant/tenant.context";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

    return this.sign({
      sub: customer.id,
      email: customer.email,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      role: "customer",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
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
