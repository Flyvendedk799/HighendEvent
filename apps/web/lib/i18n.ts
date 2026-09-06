export type Locale = "en" | "da";

const dictionaries = {
  en: {
    nav: {
      catalog: "Catalog",
      cart: "Cart",
      account: "Account",
      login: "Log in",
      register: "Register",
      dashboard: "Dashboard",
      bookings: "Bookings",
      admin: "Admin",
    },
    common: {
      search: "Search",
      save: "Save",
      cancel: "Cancel",
      continue: "Continue",
      back: "Back",
      loading: "Loading…",
      empty: "Nothing here yet",
      from: "From",
      perDay: "/ day",
      addToCart: "Add to cart",
      checkout: "Checkout",
      confirm: "Confirm booking",
    },
    storefront: {
      heroCta: "Browse catalog",
      featured: "Featured rentals",
      howItWorks: "How it works",
      pickDates: "Pick your dates",
      delivery: "Delivery or pickup",
      enjoy: "Enjoy the event",
    },
    cart: {
      title: "Your cart",
      empty: "Your cart is empty",
      subtotal: "Subtotal",
      proceed: "Proceed to checkout",
    },
    checkout: {
      title: "Checkout",
      contact: "Contact details",
      delivery: "Delivery options",
      payment: "Payment",
      placeOrder: "Place order",
    },
    confirmation: {
      title: "Booking confirmed",
      subtitle: "We sent a confirmation email with your rental details.",
    },
    admin: {
      overview: "Overview",
      products: "Products",
      categories: "Categories",
      upsells: "Upsells",
      bookings: "Bookings",
      customers: "Customers",
      calendar: "Calendar",
      locations: "Locations",
      delivery: "Delivery",
      cms: "CMS pages",
      theme: "Theme",
      media: "Media",
      analytics: "Analytics",
      settings: "Settings",
      emails: "Email templates",
      newsletter: "Newsletter",
      staff: "Staff",
      goLive: "Go-live checklist",
    },
    platform: {
      tenants: "Tenants",
      plans: "Plans & billing",
      flags: "Feature flags",
    },
  },
  da: {
    nav: {
      catalog: "Katalog",
      cart: "Kurv",
      account: "Konto",
      login: "Log ind",
      register: "Opret konto",
      dashboard: "Oversigt",
      bookings: "Bookinger",
      admin: "Admin",
    },
    common: {
      search: "Søg",
      save: "Gem",
      cancel: "Annuller",
      continue: "Fortsæt",
      back: "Tilbage",
      loading: "Indlæser…",
      empty: "Intet her endnu",
      from: "Fra",
      perDay: "/ dag",
      addToCart: "Læg i kurv",
      checkout: "Gå til kassen",
      confirm: "Bekræft booking",
    },
    storefront: {
      heroCta: "Se katalog",
      featured: "Udvalgte lejevarer",
      howItWorks: "Sådan fungerer det",
      pickDates: "Vælg datoer",
      delivery: "Levering eller afhentning",
      enjoy: "Nyd arrangementet",
    },
    cart: {
      title: "Din kurv",
      empty: "Kurven er tom",
      subtotal: "Subtotal",
      proceed: "Gå til kassen",
    },
    checkout: {
      title: "Kasse",
      contact: "Kontaktoplysninger",
      delivery: "Leveringsmuligheder",
      payment: "Betaling",
      placeOrder: "Afgiv ordre",
    },
    confirmation: {
      title: "Booking bekræftet",
      subtitle: "Vi har sendt en bekræftelse med dine lejedetaljer.",
    },
    admin: {
      overview: "Oversigt",
      products: "Produkter",
      categories: "Kategorier",
      upsells: "Mersalg",
      bookings: "Bookinger",
      customers: "Kunder",
      calendar: "Kalender",
      locations: "Lokationer",
      delivery: "Levering",
      cms: "CMS-sider",
      theme: "Tema",
      media: "Medier",
      analytics: "Analyse",
      settings: "Indstillinger",
      emails: "E-mailskabeloner",
      newsletter: "Nyhedsbrev",
      staff: "Personale",
      goLive: "Go-live tjekliste",
    },
    platform: {
      tenants: "Tenants",
      plans: "Abonnementer",
      flags: "Feature flags",
    },
  },
} as const;

export type Dictionary = {
  [K in keyof (typeof dictionaries)["en"]]: {
    [P in keyof (typeof dictionaries)["en"][K]]: string;
  };
};

export function getDictionary(locale: Locale = "en"): Dictionary {
  return (dictionaries[locale] ?? dictionaries.en) as Dictionary;
}

export function t(
  locale: Locale,
  path: string,
): string {
  const dict = getDictionary(locale) as Record<string, unknown>;
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : path;
}
