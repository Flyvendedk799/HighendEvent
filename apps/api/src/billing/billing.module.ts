import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { ConnectService } from "./connect.service";

@Module({
  controllers: [BillingController],
  providers: [BillingService, ConnectService],
  exports: [BillingService, ConnectService],
})
export class BillingModule {}
