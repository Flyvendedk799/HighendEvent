import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { StaffRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { BillingService } from "../billing/billing.service";
import { NotificationsService } from "../notifications/notifications.service";
import { hashPassword } from "../auth/password";
import type { JwtPayload } from "../auth/password";

const ROLE_RANK: Record<StaffRole, number> = {
  OWNER: 3,
  MANAGER: 2,
  STAFF: 1,
  READONLY: 0,
};

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly notifications: NotificationsService,
  ) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.staffUser.findMany({
      where: { tenantId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
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

  /**
   * Invites a colleague. The account is created immediately with a random password and an
   * invite email carrying a set-password link, so an invitee never receives a usable password
   * in plain text.
   */
  async invite(
    actor: JwtPayload,
    input: { email: string; name?: string; role: StaffRole; inviteBaseUrl: string },
  ) {
    const tenantId = requireTenantId();
    this.assertCanAssign(actor, input.role);
    await this.billing.assertWithinLimit("staff", tenantId);

    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.staffUser.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (existing?.isActive) {
      throw new ConflictException("That person already has access to this store");
    }

    // A previously deactivated colleague is reactivated rather than duplicated.
    const token = randomBytes(24).toString("hex");

    const staff = existing
      ? await this.prisma.staffUser.update({
          where: { id: existing.id },
          data: { isActive: true, role: input.role, name: input.name ?? existing.name },
        })
      : await this.prisma.staffUser.create({
          data: {
            tenantId,
            email,
            name: input.name,
            role: input.role,
            passwordHash: hashPassword(token),
          },
        });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { stores: { take: 1 } },
    });

    await this.notifications.enqueue({
      to: email,
      tenantId,
      template: "staff_invite",
      vars: {
        storeName: tenant?.stores[0]?.name ?? tenant?.name ?? "your store",
        inviterName: actor.name ?? actor.email,
        inviteUrl: `${input.inviteBaseUrl.replace(/\/$/, "")}/admin/login`,
      },
    });

    return {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      isActive: staff.isActive,
      // Shown once so the inviter can pass it on if email is not configured yet.
      temporaryPassword: existing ? null : token,
    };
  }

  async updateRole(actor: JwtPayload, id: string, role: StaffRole) {
    const tenantId = requireTenantId();
    const staff = await this.prisma.staffUser.findFirst({ where: { id, tenantId } });
    if (!staff) throw new NotFoundException("Staff member not found");

    this.assertCanAssign(actor, role);
    this.assertCanManage(actor, staff.role);

    if (staff.role === StaffRole.OWNER && role !== StaffRole.OWNER) {
      await this.assertNotLastOwner(tenantId, staff.id);
    }

    return this.prisma.staffUser.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  }

  async setActive(actor: JwtPayload, id: string, isActive: boolean) {
    const tenantId = requireTenantId();
    const staff = await this.prisma.staffUser.findFirst({ where: { id, tenantId } });
    if (!staff) throw new NotFoundException("Staff member not found");

    if (staff.id === actor.sub && !isActive) {
      throw new BadRequestException("You cannot deactivate your own account");
    }

    this.assertCanManage(actor, staff.role);

    if (!isActive && staff.role === StaffRole.OWNER) {
      await this.assertNotLastOwner(tenantId, staff.id);
    }

    if (isActive) {
      await this.billing.assertWithinLimit("staff", tenantId);
    }

    return this.prisma.staffUser.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  }

  /** A store with no active owner can never be administered again. */
  private async assertNotLastOwner(tenantId: string, exceptId: string) {
    const owners = await this.prisma.staffUser.count({
      where: { tenantId, role: StaffRole.OWNER, isActive: true, id: { not: exceptId } },
    });
    if (owners === 0) {
      throw new BadRequestException("Your store needs at least one active owner");
    }
  }

  /** Nobody may grant a role above their own. */
  private assertCanAssign(actor: JwtPayload, role: StaffRole) {
    if (actor.role === "platform") return;
    const actorRank = ROLE_RANK[(actor.staffRole ?? "READONLY") as StaffRole];
    if (actorRank < ROLE_RANK[role]) {
      throw new ForbiddenException(`You cannot grant the ${role} role`);
    }
  }

  /** Nor manage somebody more senior than themselves. */
  private assertCanManage(actor: JwtPayload, targetRole: StaffRole) {
    if (actor.role === "platform") return;
    const actorRank = ROLE_RANK[(actor.staffRole ?? "READONLY") as StaffRole];
    if (actorRank < ROLE_RANK[targetRole]) {
      throw new ForbiddenException("You cannot change an account more senior than your own");
    }
  }
}
