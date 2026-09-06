import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { StaffRole } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { StaffService } from "./staff.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class InviteStaffDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;
}

class ActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

@Controller("staff")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.list();
  }

  @Post("invite")
  invite(@Body() body: InviteStaffDto) {
    return this.staff.invite(body);
  }

  @Patch(":id/active")
  setActive(@Param("id") id: string, @Body() body: ActiveDto) {
    return this.staff.setActive(id, body.isActive);
  }
}
