CREATE TYPE "public"."order_verification_status" AS ENUM('tanpa_nomor', 'ditemukan', 'tidak_ditemukan');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('transfer_bank', 'virtual_account', 'kartu_kredit', 'e_wallet');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('menunggu', 'lunas', 'gagal', 'dikembalikan');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('elektronik', 'peralatan_dapur', 'fashion', 'dekorasi_rumah', 'kecantikan');--> statement-breakpoint
CREATE TYPE "public"."shipping_status" AS ENUM('belum_dikirim', 'diproses', 'dikirim', 'diterima');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('berhasil', 'gagal', 'menunggu');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_rupiah" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"ordered_at" timestamp with time zone NOT NULL,
	"total_rupiah" bigint NOT NULL,
	"payment_status" "payment_status" NOT NULL,
	"shipping_status" "shipping_status" NOT NULL,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_rupiah" bigint NOT NULL,
	"status" "transaction_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" "product_category" NOT NULL,
	"price_rupiah" bigint NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
-- Issue lama dibuat sebelum database order ada: yang menyebut nomor order dianggap tidak ditemukan.
ALTER TABLE "issues" ADD COLUMN "order_verification" "order_verification_status" NOT NULL DEFAULT 'tanpa_nomor';--> statement-breakpoint
UPDATE "issues" SET "order_verification" = 'tidak_ditemukan' WHERE "order_number" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "order_verification" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "verified_order_number" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "is_sender_order_owner" boolean;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;