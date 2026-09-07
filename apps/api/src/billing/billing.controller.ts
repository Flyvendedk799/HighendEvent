import { Body, Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { PlanTier } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUrl } from "class-validator";
import { BillingService } from "./billing.service";
import { ConnectService } from "./connect.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles, StaffRoles, ADMIN_STAFF_ROLES } from "../auth/roles.decorator";

class SubscribeDto {
  @IsEnum(PlanTier) plan!: PlanTier;
  @IsOptional() @IsString() tenantId?: string;
}

class OnboardingLinkDto {
  @IsUrl({ require_tld: false }) refreshUrl!: string;
  @IsUrl({ require_tld: false }) returnUrl!: string;
}

@Controller("billing")
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly connect: ConnectService,
  ) {}

  @Get("plans")
  plans() {
    return this.billing.listPlans();
  }

  @Get("subscription")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  current() {
    return this.billing.currentSubscription();
  }

  @Get("limits")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  limits() {
    return this.billing.planUsage();
  }

  @Post("subscription")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  @StaffRoles(...ADMIN_STAFF_ROLES)
  subscribe(@Body() body: SubscribeDto) {
    return this.billing.createSubscriptionStub(body);
  }

  @Delete("subscription")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  @StaffRoles(...ADMIN_STAFF_ROLES)
  cancel() {
    return this.billing.cancelSubscriptionStub();
  }

  @Get("connect/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  connectStatus() {
    return this.connect.status();
  }

  @Post("connect/onboarding-link")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  @StaffRoles(...ADMIN_STAFF_ROLES)
  connectOnboardingLink(@Body() body: OnboardingLinkDto) {
    return this.connect.createOnboardingLink(body);
  }

  @Post("connect/dashboard-link")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  @StaffRoles(...ADMIN_STAFF_ROLES)
  connectDashboardLink() {
    return this.connect.createDashboardLink();
  }
}
