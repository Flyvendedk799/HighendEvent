import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { DomainsService } from "./domains.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class AddDomainDto {
  @IsString()
  @MinLength(3)
  hostname!: string;
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
  add(@Body() body: AddDomainDto) {
    return this.domains.add(body.hostname);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.domains.remove(id);
  }

  @Post(":id/verify")
  verify(@Param("id") id: string) {
    return this.domains.verify(id);
  }
}
