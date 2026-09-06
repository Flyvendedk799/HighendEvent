import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsEmail } from "class-validator";
import { NewsletterService } from "./newsletter.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class EmailDto {
  @IsEmail() email!: string;
}

@Controller("newsletter")
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  list() {
    return this.newsletter.list();
  }

  @Post("subscribe")
  subscribe(@Body() body: EmailDto) {
    return this.newsletter.subscribe(body.email);
  }

  @Post("unsubscribe")
  unsubscribe(@Body() body: EmailDto) {
    return this.newsletter.unsubscribe(body.email);
  }
}
