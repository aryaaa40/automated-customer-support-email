ALTER TYPE "public"."order_verification_status" ADD VALUE 'nomor_ambigu';--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "is_order_number_corrected" boolean;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "candidate_order_numbers" text[];--> statement-breakpoint
-- Issue lama yang ordernya ditemukan berasal dari pencarian persis, bukan koreksi.
UPDATE "issues" SET "is_order_number_corrected" = false WHERE "order_verification" = 'ditemukan';
