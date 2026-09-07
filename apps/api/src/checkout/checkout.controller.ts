import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from "class-validator";
import { CheckoutService } from "./checkout.service";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/password";
import type { CartOwner } from "../cart/cart.service";

class DeliveryQuoteDto {
  @IsString() @MinLength(1) address!: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
}

class CheckoutDto {
  @IsOptional() @IsString() @MinLength(8) sessionId?: string;
  @IsString() @MinLength(1) customerName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(1) phone!: string;
  @IsString() @MinLength(1) address!: string;
  @IsString() @MinLength(1) zipCode!: string;
  @IsString() @MinLength(1) city!: string;
  @IsOptional() @IsString() country?: string;
  @IsEnum(DeliveryType) deliveryType!: DeliveryType;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsString() locale?: string;
  @IsUrl({ require_tld: false }) successUrl!: string;
  @IsUrl({ require_tld: false }) cancelUrl!: string;
}

class RemainderDto {
  @IsString() bookingId!: string;
  @IsUrl({ require_tld: false }) successUrl!: string;
  @IsUrl({ require_tld: false }) cancelUrl!: string;
}

@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post("delivery-quote")
  @UseGuards(OptionalJwtAuthGuard)
  quoteDelivery(@Body() body: DeliveryQuoteDto) {
    return this.checkout.quoteDelivery(body);
  }

  @Get("confirmation")
  confirmation(@Query("sessionId") sessionId: string) {
    if (!sessionId) throw new BadRequestException("sessionId is required");
    return this.checkout.confirmation(sessionId);
  }

  @Post("session")
  @UseGuards(OptionalJwtAuthGuard)
  createSession(@CurrentUser() user: JwtPayload | undefined, @Body() body: CheckoutDto) {
    const { sessionId, ...input } = body;
    return this.checkout.createSession({ ...input, owner: owner(user, sessionId) });
  }

  @Post("remainder")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  createRemainder(@Body() body: RemainderDto) {
    return this.checkout.createRemainderSession(body);
  }
}

function owner(user: JwtPayload | undefined, sessionId?: string): CartOwner {
  if (user?.role === "customer") return { customerId: user.sub };
  if (!sessionId) throw new BadRequestException("sessionId is required for guest checkout");
  return { sessionId };
}
