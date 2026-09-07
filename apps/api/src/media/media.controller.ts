import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsInt, IsOptional, IsString, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { MediaService } from "./media.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class UploadUrlDto {
  @IsString() @MinLength(1) filename!: string;
  @IsString() @MinLength(1) mimeType!: string;
  @IsOptional() @Type(() => Number) @IsInt() sizeBytes?: number;
  @IsOptional() @IsString() alt?: string;
}

class ExternalMediaDto {
  @IsString() @MinLength(1) url!: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @IsString() mimeType?: string;
}

class UpdateMediaDto {
  @IsOptional() @IsString() alt?: string;
}

@Controller("media")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@Query("limit") limit?: string) {
    return this.media.list({ limit: limit ? Number(limit) : undefined });
  }

  @Get("storage-status")
  storageStatus() {
    return this.media.storageStatus();
  }

  @Post("upload-url")
  createUploadUrl(@Body() body: UploadUrlDto) {
    return this.media.createUploadUrl(body);
  }

  @Post("external")
  registerExternal(@Body() body: ExternalMediaDto) {
    return this.media.registerExternal(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateMediaDto) {
    return this.media.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.media.remove(id);
  }
}
