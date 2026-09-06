import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsInt, IsOptional, IsString, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { MediaService } from "./media.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class UploadDto {
  @IsString() @MinLength(1) filename!: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @Type(() => Number) @IsInt() width?: number;
  @IsOptional() @Type(() => Number) @IsInt() height?: number;
}

@Controller("media")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list() {
    return this.media.list();
  }

  @Post("upload")
  upload(@Body() body: UploadDto) {
    return this.media.uploadStub(body);
  }
}
