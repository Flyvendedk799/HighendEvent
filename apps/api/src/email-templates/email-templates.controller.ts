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
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { EmailTemplatesService } from "./email-templates.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class TemplateDto {
  @IsString() @MinLength(1) key!: string;
  @IsString() @MinLength(1) subject!: string;
  @IsString() @MinLength(1) bodyHtml!: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdateTemplateDto {
  @IsOptional() @IsString() @MinLength(1) subject?: string;
  @IsOptional() @IsString() @MinLength(1) bodyHtml?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class PreviewDto {
  @IsString() subject!: string;
  @IsString() bodyHtml!: string;
}

class TestSendDto {
  @IsEmail() to!: string;
  @IsString() subject!: string;
  @IsString() bodyHtml!: string;
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

  @Post("preview")
  preview(@Body() body: PreviewDto) {
    return this.templates.preview(body);
  }

  @Post("test-send")
  testSend(@Body() body: TestSendDto) {
    return this.templates.sendTest(body);
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
  update(@Param("id") id: string, @Body() body: UpdateTemplateDto) {
    return this.templates.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.templates.remove(id);
  }
}
