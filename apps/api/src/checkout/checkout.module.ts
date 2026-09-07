import { Module } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { BookingsModule } from "../bookings/bookings.module";
import { CartModule } from "../cart/cart.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { CouponsModule } from "../coupons/coupons.module";

@Module({
  imports: [BookingsModule, CartModule, DeliveryModule, CouponsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
