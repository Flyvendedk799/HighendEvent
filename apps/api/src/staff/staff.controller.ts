import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { StaffRole } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUrl } from "class-validator";
import { StaffService } from "./staff.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles, StaffRoles, ADMIN_STAFF_ROLES } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/password";

class InviteDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() name?: string;
  @IsEnum(StaffRole) role!: StaffRole;
  @IsUrl({ require_tld: false }) inviteBaseUrl!: string;
}

class RoleDto {
  @IsEnum(StaffRole) role!: StaffRole;
}

class ActiveDto {
  @IsBoolean() isActive!: boolean;
}

@Controller("staff")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.list();
  }

  @Post("invite")
  @StaffRoles(...ADMIN_STAFF_ROLES)
  invite(@CurrentUser() user: JwtPayload, @Body() body: InviteDto) {
    return this.staff.invite(user, body);
  }

  @Patch(":id/role")
  @StaffRoles(...ADMIN_STAFF_ROLES)
  updateRole(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() body: RoleDto) {
    return this.staff.updateRole(user, id, body.role);
  }

  @Patch(":id/active")
  @StaffRoles(...ADMIN_STAFF_ROLES)
  setActive(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() body: ActiveDto) {
    return this.staff.setActive(user, id, body.isActive);
  }
}
