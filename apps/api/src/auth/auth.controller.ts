import { Body, Controller, Post } from "@nestjs/common";
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service";
import type { AuthRole } from "./password";

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

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }
}
