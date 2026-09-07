import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { TenantMiddleware } from "./tenant/tenant.middleware";
import { TenantBindingInterceptor } from "./tenant/tenant-binding.interceptor";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { PlatformModule } from "./platform/platform.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { CatalogModule } from "./catalog/catalog.module";
import { AvailabilityModule } from "./availability/availability.module";
import { PricingModule } from "./pricing/pricing.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { BookingsModule } from "./bookings/bookings.module";
import { CartModule } from "./cart/cart.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { CustomersModule } from "./customers/customers.module";
import { CmsModule } from "./cms/cms.module";
import { MediaModule } from "./media/media.module";
import { ThemesModule } from "./themes/themes.module";
import { LocationsModule } from "./locations/locations.module";
import { DeliverySettingsModule } from "./delivery-settings/delivery-settings.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { NewsletterModule } from "./newsletter/newsletter.module";
import { EmailTemplatesModule } from "./email-templates/email-templates.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { GdprModule } from "./gdpr/gdpr.module";
import { BillingModule } from "./billing/billing.module";
import { StorefrontModule } from "./storefront/storefront.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
    PlatformModule,
    OnboardingModule,
    CatalogModule,
    AvailabilityModule,
    PricingModule,
    DeliveryModule,
    BookingsModule,
    CartModule,
    CheckoutModule,
    CustomersModule,
    CmsModule,
    MediaModule,
    ThemesModule,
    LocationsModule,
    DeliverySettingsModule,
    AnalyticsModule,
    NewsletterModule,
    EmailTemplatesModule,
    WebhooksModule,
    GdprModule,
    BillingModule,
    StorefrontModule,
  ],
  providers: [
    TenantMiddleware,
    { provide: APP_INTERCEPTOR, useClass: TenantBindingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
