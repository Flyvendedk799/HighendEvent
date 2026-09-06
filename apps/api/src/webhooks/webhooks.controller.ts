import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { IsArray, IsString, IsUrl } from "class-validator";
import { WebhooksService } from "./webhooks.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class EndpointDto {
  @IsUrl({ require_tld: false }) url!: string;
  @IsArray() @IsString({ each: true }) events!: string[];
}

class DispatchDto {
  @IsString() event!: string;
  payload?: unknown;
}

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get("endpoints")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  list() {
    return this.webhooks.listEndpoints();
  }

  @Post("endpoints")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  create(@Body() body: EndpointDto) {
    return this.webhooks.createEndpoint(body);
  }

  @Delete("endpoints/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  remove(@Param("id") id: string) {
    return this.webhooks.deleteEndpoint(id);
  }

  @Post("dispatch")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  dispatch(@Body() body: DispatchDto) {
    return this.webhooks.dispatchTenantEvent(body.event, body.payload ?? {});
  }

  @Post("stripe")
  stripeInbound(
    @Req() req: { rawBody?: Buffer; body?: unknown },
    @Headers("stripe-signature") signature?: string,
  ) {
    const raw =
      req.rawBody ??
      Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));
    return this.webhooks.handleStripeWebhook(raw, signature);
  }
}
