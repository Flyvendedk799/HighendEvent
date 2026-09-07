-- Confirmation-link state for customer signup.
--
-- Both columns stay NULL unless AUTH_EMAIL_VERIFICATION is on: the default
-- signup flow sends a welcome email and the account works immediately. Adding
-- them is safe for existing rows, and existing customers keep whatever
-- emailVerified value they already had.
ALTER TABLE "Customer" ADD COLUMN "verifyToken" TEXT;
ALTER TABLE "Customer" ADD COLUMN "verifyTokenExpiresAt" TIMESTAMP(3);

-- Unique so a token identifies its customer on its own, which is what lets the
-- confirmation endpoint look up by token alone. NULLs do not collide in
-- Postgres, so every unverified-but-not-pending row is unaffected.
CREATE UNIQUE INDEX "Customer_verifyToken_key" ON "Customer"("verifyToken");
