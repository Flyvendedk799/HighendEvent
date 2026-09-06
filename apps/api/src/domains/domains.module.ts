import { Global, Module, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import { DomainsController } from "./domains.controller";
import { DOMAIN_SSL_QUEUE, DomainsService } from "./domains.service";

@Global()
@Module({
  controllers: [DomainsController],
  providers: [
    {
      provide: "DOMAIN_SSL_QUEUE",
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        return new Queue(DOMAIN_SSL_QUEUE, {
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
    DomainsService,
  ],
  exports: [DomainsService, "DOMAIN_SSL_QUEUE"],
})
export class DomainsModule implements OnModuleDestroy {
  constructor(private readonly domains: DomainsService) {}

  async onModuleDestroy() {
    await this.domains.close();
  }
}
