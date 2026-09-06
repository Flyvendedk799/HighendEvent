import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { StaffRole } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword } from "../auth/password";
import { requireTenantId } from "../common/tenant.util";
import { assertStaffLimit } from "../common/plan-limits";

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.staffUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async invite(input: {
    email: string;
    name?: string;
    role?: StaffRole;
  }) {
    const tenantId = requireTenantId();
    await assertStaffLimit(this.prisma, tenantId);

    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.staffUser.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (existing) throw new BadRequestException("Staff user already exists");

    const temporaryPassword = randomBytes(9).toString("base64url");
    const user = await this.prisma.staffUser.create({
      data: {
        tenantId,
        email,
        name: input.name?.trim() || email.split("@")[0] || "Staff",
        role: input.role ?? StaffRole.STAFF,
        passwordHash: hashPassword(temporaryPassword),
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "STAFF",
        action: "staff.invite",
        entityType: "StaffUser",
        entityId: user.id,
        meta: { email: user.email, role: user.role },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return {
      ...user,
      invite: {
        temporaryPassword,
        acceptUrl: `${appUrl}/admin/login?email=${encodeURIComponent(email)}`,
        note: "Stub invite: share the temporary password; email delivery via worker later.",
      },
    };
  }

  async setActive(id: string, isActive: boolean) {
    const tenantId = requireTenantId();
    const existing = await this.prisma.staffUser.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException("Staff user not found");
    return this.prisma.staffUser.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }
}
