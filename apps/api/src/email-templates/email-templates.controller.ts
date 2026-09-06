import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";
import { EmailTemplatesService } from "./email-templates.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class TemplateDto {
  @IsString() @MinLength(1) key!: string;
  @IsString() subject!: string;
  @IsString() bodyHtml!: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller("email-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class EmailTemplatesController {
  constructor(private readonly templates: EmailTemplatesService) {}

  @Get()
  list() {
    return this.templates.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.templates.get(id);
  }

  @Post()
  create(@Body() body: TemplateDto) {
    return this.templates.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Partial<TemplateDto>) {
    return this.templates.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.templates.remove(id);
  }
}
