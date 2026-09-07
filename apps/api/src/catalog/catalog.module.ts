import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
