import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { verifyPassword, type AuthRole, type JwtPayload } from "./password";
import { tryGetTenantContext } from "../tenant/tenant.context";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(input: { email: string; password: string; role: AuthRole; tenantSlug?: string }) {
    if (input.role === "platform") {
      const user = await this.prisma.platformUser.findUnique({ where: { email: input.email } });
      if (!user?.isActive || !verifyPassword(input.password, user.passwordHash)) {
        throw new UnauthorizedException("Invalid credentials");
      }
      return this.sign({ sub: user.id, email: user.email, role: "platform" });
    }

    const tenantId =
      input.tenantSlug
        ? (await this.prisma.tenant.findUnique({ where: { slug: input.tenantSlug } }))?.id
        : tryGetTenantContext()?.tenantId;

    if (!tenantId) throw new BadRequestException("tenantSlug or X-Tenant-Slug required");

    if (input.role === "staff") {
      const user = await this.prisma.staffUser.findUnique({
        where: { tenantId_email: { tenantId, email: input.email } },
      });
      if (!user?.isActive || !verifyPassword(input.password, user.passwordHash)) {
        throw new UnauthorizedException("Invalid credentials");
      }
      await this.prisma.staffUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      return this.sign({
        sub: user.id,
        email: user.email,
        role: "staff",
        tenantId,
        staffRole: user.role,
      });
    }

    const customer = await this.prisma.customer.findUnique({
      where: { tenantId_email: { tenantId, email: input.email } },
    });
    if (!customer?.isActive || !verifyPassword(input.password, customer.passwordHash)) {
      throw new UnauthorizedException("Invalid credentials");
    }
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });
    return this.sign({
      sub: customer.id,
      email: customer.email,
      role: "customer",
      tenantId,
    });
  }

  private sign(payload: JwtPayload) {
    return {
      accessToken: this.jwt.sign(payload),
      user: payload,
    };
  }
}
