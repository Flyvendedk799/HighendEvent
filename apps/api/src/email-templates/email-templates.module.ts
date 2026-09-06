import { Module } from "@nestjs/common";
import { EmailTemplatesController } from "./email-templates.controller";
import { EmailTemplatesService } from "./email-templates.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
