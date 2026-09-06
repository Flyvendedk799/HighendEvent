import { Controller, Delete, Get, Param, UseGuards } from "@nestjs/common";
import { GdprService } from "./gdpr.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("gdpr")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class GdprController {
  constructor(private readonly gdpr: GdprService) {}

  @Get("customers/:id/export")
  export(@Param("id") id: string) {
    return this.gdpr.exportCustomer(id);
  }

  @Delete("customers/:id")
  remove(@Param("id") id: string) {
    return this.gdpr.deleteCustomer(id);
  }
}
