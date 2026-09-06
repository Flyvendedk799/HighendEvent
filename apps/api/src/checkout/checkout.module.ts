import { Module } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { BookingsModule } from "../bookings/bookings.module";

@Module({
  imports: [BookingsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
