import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { DomainsService } from "./domains.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles, StaffRoles, ADMIN_STAFF_ROLES } from "../auth/roles.decorator";

class AddDomainDto {
  @IsString() @MinLength(4) hostname!: string;
}

@Controller("domains")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get()
  list() {
    return this.domains.list();
  }

  @Post()
  @StaffRoles(...ADMIN_STAFF_ROLES)
  add(@Body() body: AddDomainDto) {
    return this.domains.add(body.hostname);
  }

  @Post(":id/verify")
  verify(@Param("id") id: string) {
    return this.domains.verify(id);
  }

  @Delete(":id")
  @StaffRoles(...ADMIN_STAFF_ROLES)
  remove(@Param("id") id: string) {
    return this.domains.remove(id);
  }
}
