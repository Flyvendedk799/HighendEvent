import { Body, Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { PlanTier } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUrl } from "class-validator";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class SubscribeDto {
  @IsEnum(PlanTier) plan!: PlanTier;
  @IsOptional() @IsString() tenantId?: string;
}

class ConnectOnboardDto {
  @IsUrl({ require_tld: false }) returnUrl!: string;
  @IsUrl({ require_tld: false }) refreshUrl!: string;
}

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

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

  @Post("subscription")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  subscribe(@Body() body: SubscribeDto) {
    return this.billing.createSubscriptionStub(body);
  }

  @Delete("subscription")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  cancel() {
    return this.billing.cancelSubscriptionStub();
  }

  @Post("connect/onboard")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  connectOnboard(@Body() body: ConnectOnboardDto) {
    return this.billing.createConnectOnboardingLink(body);
  }

  @Post("connect/refresh")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  connectRefresh() {
    return this.billing.refreshConnectStatus();
  }
}
