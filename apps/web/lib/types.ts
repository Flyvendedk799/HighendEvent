/**
 * Response shapes returned by the Rentora API.
 *
 * These are hand-maintained rather than generated: the API is a separate deploy target, so the
 * web app treats it as a contract. Anything the web app reads must appear here.
 */

export type PlanTier = "STARTER" | "GROWTH" | "SCALE";
export type DeliveryType = "PICKUP" | "DELIVERY";
export type PaymentModel = "FULL_UPFRONT" | "DEPOSIT_REMAINDER";
export type TaxMode = "INCLUSIVE" | "EXCLUSIVE";
export type BookingSource = "ONLINE" | "MANUAL";
export type StaffRole = "OWNER" | "MANAGER" | "STAFF" | "READONLY";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
};

export type Blackout = {
  id: string;
  productId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
};

export type UpsellProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMinor: number;
  currency: string;
  stockQty?: number | null;
  imageUrl?: string | null;
  isActive: boolean;
};

export type Product = {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string | null;
  dailyPriceMinor: number;
  weekendPriceMinor?: number | null;
  weekendPackageMinor?: number | null;
  depositMinor: number;
  currency: string;
  stockQty: number;
  prepBufferDays: number;
  cleanupBufferDays: number;
  minRentalDays: number;
  maxRentalDays?: number | null;
  heroImageUrl?: string | null;
  attributes: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  images?: ProductImage[];
  blackouts?: Blackout[];
  upsells?: Array<{ id: string; sortOrder: number; upsellProduct: UpsellProduct }>;
};

export type DayAvailability = {
  date: string;
  availableQuantity: number;
  isAvailable: boolean;
  isBlackedOut: boolean;
};

export type AvailabilityCheck = {
  productId: string;
  startDate: string;
  endDate: string;
  availableQuantity: number;
  isAvailable: boolean;
  requestedQuantity: number;
};

export type PricingLineItem = {
  name: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  description?: string;
};

export type PricingBreakdown = {
  lineItems: PricingLineItem[];
  subtotalMinor: number;
  taxMinor: number;
  taxPercentBps: number;
  depositMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  upfrontMinor: number;
  remainingMinor: number;
  currency: string;
};

export type BookingItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPriceMinor: number;
  nameSnapshot: string;
  product?: Product;
};

export type Customer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  zipCode?: string | null;
  city?: string | null;
  country?: string | null;
  isGuest: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
};

export type Booking = {
  id: string;
  tenantId: string;
  bookingNo: string;
  customerId?: string | null;
  source: BookingSource;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  depositMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  upfrontMinor: number;
  remainingMinor: number;
  statusKey: string;
  deliveryType: DeliveryType;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  returnCondition?: string | null;
  damageFeeMinor: number;
  discountMinor: number;
  couponCode?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: BookingItem[];
  customer?: Customer | null;
};

export type StorefrontBootstrap = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: PlanTier;
    featureFlags: Record<string, boolean>;
    connectOnboarded: boolean;
    primaryDomain: string | null;
  };
  store: {
    id: string;
    name: string;
    tagline: string | null;
    localeDefault: string;
    locales: string[];
    currency: string;
    timezone: string;
    country: string;
    taxMode: TaxMode;
    taxPercentBps: number;
    paymentModel: PaymentModel;
    depositPercentBps: number;
    logoUrl: string | null;
    faviconUrl: string | null;
    brandColors: Record<string, string>;
    fonts: Record<string, string>;
    supportEmail: string | null;
    supportPhone: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  theme: {
    id: string | null;
    name: string;
    tokens: Record<string, string>;
  };
  categories: Array<Pick<Category, "id" | "name" | "slug" | "imageUrl">>;
  pages: Array<{ slug: string; title: string; locale: string }>;
  features: {
    deliveryEnabled: boolean;
    hasProducts: boolean;
  };
};

export type AnalyticsKpis = {
  bookingsTotal: number;
  bookingsLast30Days: number;
  revenueMinor: number;
  depositsMinor: number;
  activeCustomers: number;
  activeProducts: number;
  bookingsByStatus: Array<{ statusKey: string; count: number }>;
};

export type LoginResponse = {
  accessToken: string;
  expiresIn: string;
  user: {
    sub: string;
    email: string;
    name?: string;
    role: "platform" | "staff" | "customer";
    tenantId?: string;
    tenantSlug?: string;
    staffRole?: StaffRole;
  };
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  deliveryType: DeliveryType;
  startDate: string | null;
  endDate: string | null;
  product: Product & { images?: ProductImage[] };
  upsells: Array<{
    id: string;
    quantity: number;
    upsellProduct: UpsellProduct;
  }>;
};

export type Cart = {
  id: string;
  items: CartItem[];
};

export type CartSummary = {
  cart: Cart;
  currency: string;
  paymentModel: PaymentModel;
  itemCount: number;
  upsellTotalMinor: number;
  pricing: PricingBreakdown | null;
  /** Per-line problems that block checkout: missing dates, sold out since adding. */
  issues: Array<{ itemId: string; message: string }>;
  checkoutReady: boolean;
};

export type AvailabilityCalendar = {
  productId: string;
  stockQty: number;
  prepBufferDays: number;
  cleanupBufferDays: number;
  days: DayAvailability[];
};

export type AvailabilityOverview = {
  startDate: string;
  endDate: string;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    stockQty: number;
    days: DayAvailability[];
  }>;
  bookings: Array<{
    bookingId: string;
    bookingNo: string;
    customerName: string;
    productId: string;
    quantity: number;
    statusKey: string;
    startDate: string;
    endDate: string;
  }>;
};

export type DeliveryQuote = {
  feeMinor: number;
  allowed: boolean;
  distanceKm: number;
  chargeableKm: number;
  explanation: string;
  currency: string;
};
