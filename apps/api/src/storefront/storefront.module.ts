import { Module } from "@nestjs/common";
import { StorefrontController } from "./storefront.controller";
import { StorefrontService } from "./storefront.service";
import { StoreSettingsController } from "./store-settings.controller";
import { StoreSettingsService } from "./store-settings.service";

@Module({
  controllers: [StorefrontController, StoreSettingsController],
  providers: [StorefrontService, StoreSettingsService],
  exports: [StorefrontService, StoreSettingsService],
})
export class StorefrontModule {}
