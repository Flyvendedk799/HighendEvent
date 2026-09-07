import { Module } from "@nestjs/common";
import { DomainsController } from "./domains.controller";
import { DomainsService } from "./domains.service";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [BillingModule],
  controllers: [DomainsController],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
