import { Global, Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

/**
 * Global so any module can send transactional email without importing a chain of modules for
 * something as cross-cutting as "tell the customer what happened".
 */
@Global()
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
