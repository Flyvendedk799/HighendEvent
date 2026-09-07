import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { CustomersService } from "./customers.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/password";

class CreateCustomerDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsOptional() @IsBoolean() isGuest?: boolean;
}

class UpdateCustomerDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(1) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
}

/**
 * A customer principal may only ever address their own record. Staff may address any customer
 * in their own tenant, which the RolesGuard tenant binding already enforces.
 */
function assertSelfOrStaff(user: JwtPayload | undefined, customerId: string): void {
  if (user?.role === "customer" && user.sub !== customerId) {
    throw new ForbiddenException("You can only access your own account");
  }
}

@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  list(@Query("q") q?: string) {
    return this.customers.list({ q });
  }

  @Get(":id/history")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  history(@Param("id") id: string) {
    return this.customers.getWithHistory(id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform", "customer")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    assertSelfOrStaff(user, id);
    return this.customers.get(id);
  }

  /**
   * Staff-created customer records. Shoppers create their own account through /auth/register,
   * and guest checkout creates one server-side — neither goes through here.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  create(@Body() body: CreateCustomerDto) {
    return this.customers.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform", "customer")
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: UpdateCustomerDto,
  ) {
    assertSelfOrStaff(user, id);
    return this.customers.update(id, body);
  }

  @Patch(":id/deactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  deactivate(@Param("id") id: string) {
    return this.customers.deactivate(id);
  }
}
