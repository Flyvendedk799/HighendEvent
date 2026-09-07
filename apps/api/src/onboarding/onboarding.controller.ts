import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { PlanTier } from "@prisma/client";
import { OnboardingService } from "./onboarding.service";

class OnboardDto {
  @IsString() @MinLength(2) @MaxLength(80) tenantName!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: "Use lowercase letters, numbers and hyphens only",
  })
  @MinLength(3)
  @MaxLength(30)
  slug!: string;

  @IsString() @MinLength(2) @MaxLength(80) storeName!: string;
  @IsEmail() ownerEmail!: string;
  @IsString() @MinLength(1) @MaxLength(80) ownerName!: string;
  @IsString() @MinLength(8) @MaxLength(200) ownerPassword!: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsEnum(PlanTier) plan?: PlanTier;
}

@Controller("onboarding")
export class OnboardingController {
  constructor(
    private readonly onboarding: OnboardingService,
    private readonly jwt: JwtService,
  ) {}

  @Get("check-slug")
  checkSlug(@Query("slug") slug: string) {
    return this.onboarding.checkSlug(slug ?? "");
  }

  /**
   * Creates the tenant and signs the owner straight in, so signup lands in a working console
   * rather than on another login form.
   */
  @Post()
  async create(@Body() body: OnboardDto) {
    const result = await this.onboarding.onboard(body);

    const accessToken = this.jwt.sign({
      sub: result.owner.id,
      email: result.owner.email,
      name: body.ownerName,
      role: "staff",
      tenantId: result.tenant.id,
      tenantSlug: result.tenant.slug,
      staffRole: result.owner.role,
    });

    return { ...result, accessToken };
  }
}
