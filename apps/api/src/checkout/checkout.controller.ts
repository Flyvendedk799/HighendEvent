import { Body, Controller, Post } from "@nestjs/common";
import { IsEmail, IsOptional, IsString, IsUrl, MinLength } from "class-validator";
import { CheckoutService } from "./checkout.service";

class CheckoutDto {
  @IsOptional() @IsString() cartId?: string;
  @IsOptional() @IsString() bookingId?: string;
  @IsUrl({ require_tld: false }) successUrl!: string;
  @IsUrl({ require_tld: false }) cancelUrl!: string;
  @IsOptional() @IsString() @MinLength(1) customerName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() city?: string;
}

@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post("session")
  createSession(@Body() body: CheckoutDto) {
    return this.checkout.createSession(body);
  }
}
