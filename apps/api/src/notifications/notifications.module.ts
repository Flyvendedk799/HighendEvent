import { Global, Module, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import { NotificationsService } from "./notifications.service";

export const EMAIL_QUEUE = "email";

@Global()
@Module({
  providers: [
    {
      provide: "EMAIL_QUEUE",
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        return new Queue(EMAIL_QUEUE, {
          connection: { url: redisUrl },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 200,
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          },
        });
      },
    },
    NotificationsService,
  ],
  exports: [NotificationsService, "EMAIL_QUEUE"],
})
export class NotificationsModule implements OnModuleDestroy {
  constructor(private readonly notifications: NotificationsService) {}

  async onModuleDestroy() {
    await this.notifications.close();
  }
}
