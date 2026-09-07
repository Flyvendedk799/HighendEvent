import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import type { AuthRole, JwtPayload } from "./password";

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsIn(["platform", "staff", "customer"])
  role!: AuthRole;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  newPassword!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.auth.registerCustomer(body);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: JwtPayload, @Body() body: ChangePasswordDto) {
    return this.auth.changePassword(user, body.currentPassword, body.newPassword);
  }
}
