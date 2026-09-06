import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { CustomersService } from "./customers.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class CreateCustomerDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsBoolean() isGuest?: boolean;
}

@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  list() {
    return this.customers.list();
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform", "customer")
  get(@Param("id") id: string) {
    return this.customers.get(id);
  }

  @Post()
  create(@Body() body: CreateCustomerDto) {
    return this.customers.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform", "customer")
  update(@Param("id") id: string, @Body() body: Partial<CreateCustomerDto>) {
    return this.customers.update(id, body);
  }

  @Patch(":id/deactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  deactivate(@Param("id") id: string) {
    return this.customers.deactivate(id);
  }
}
