-- The language the customer shopped in, so their confirmation and reminders come back
-- in the same language rather than the store default.
ALTER TABLE "Booking" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';
