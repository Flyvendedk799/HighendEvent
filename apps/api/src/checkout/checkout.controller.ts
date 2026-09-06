import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { CheckoutService } from "./checkout.service";

class CheckoutItemDto {
  @IsString() productId!: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

class CheckoutDto {
  @IsOptional() @IsString() cartId?: string;
  @IsOptional() @IsString() bookingId?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items?: CheckoutItemDto[];
  @IsUrl({ require_tld: false }) successUrl!: string;
  @IsUrl({ require_tld: false }) cancelUrl!: string;
  @IsOptional() @IsString() @MinLength(1) customerName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
  @IsOptional() @Type(() => Number) @IsInt() deliveryFeeMinor?: number;
  @IsOptional() @IsString() couponCode?: string;
}

class CompleteStubDto {
  @IsString() @MinLength(1) sessionId!: string;
}

@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post("session")
  createSession(@Body() body: CheckoutDto) {
    return this.checkout.createSession(body);
  }

  @Get("session/:sessionId")
  getSession(@Param("sessionId") sessionId: string) {
    return this.checkout.getBySession(sessionId);
  }

  @Post("complete-stub")
  completeStub(@Body() body: CompleteStubDto) {
    return this.checkout.completeStub(body.sessionId);
  }
}
