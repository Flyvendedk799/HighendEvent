import { Controller, Get } from "@nestjs/common";
import { StorefrontService } from "./storefront.service";

@Controller("storefront")
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}

  @Get("bootstrap")
  bootstrap() {
    return this.storefront.bootstrap();
  }
}
