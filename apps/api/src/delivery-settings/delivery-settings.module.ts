import { Module } from "@nestjs/common";
import { DeliverySettingsController } from "./delivery-settings.controller";
import { DeliverySettingsService } from "./delivery-settings.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [DeliverySettingsController],
  providers: [DeliverySettingsService],
})
export class DeliverySettingsModule {}
