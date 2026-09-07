export function StoreNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Rentora
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">This store is not available</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          The address you used does not point to a live Rentora store. If you own this store, check
          that its domain is verified and the store is not suspended.
        </p>
      </div>
    </div>
  );
}
