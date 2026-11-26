CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."kategori" AS ENUM('barang_rusak', 'salah_kirim', 'pengiriman_bermasalah', 'refund', 'masalah_pembayaran', 'masalah_akun', 'pertanyaan_produk', 'spam');--> statement-breakpoint
CREATE TYPE "public"."sentimen" AS ENUM('positif', 'netral', 'kesal', 'marah');--> statement-breakpoint
CREATE TYPE "public"."status_tiket" AS ENUM('antrian_review', 'diteruskan', 'selesai', 'diarsipkan');--> statement-breakpoint
CREATE TYPE "public"."urgensi" AS ENUM('rendah', 'sedang', 'tinggi', 'kritis');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"content" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incoming_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" text NOT NULL,
	"sender" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incoming_emails_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"category" "kategori" NOT NULL,
	"urgency" "urgensi" NOT NULL,
	"summary" text NOT NULL,
	"order_number" text,
	"order_number_source" text,
	"amount" bigint,
	"amount_source" text,
	"date" text,
	"date_source" text,
	"product_name" text,
	"product_name_source" text
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" uuid NOT NULL,
	"status" "status_tiket" NOT NULL,
	"sentiment" "sentimen" NOT NULL,
	"threat" boolean NOT NULL,
	"threat_evidence" text,
	"injection_attempt" boolean NOT NULL,
	"injection_evidence" text,
	"ambiguous" boolean NOT NULL,
	"ambiguous_reason" text,
	"extraction" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_email_id_unique" UNIQUE("email_id")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_email_id_incoming_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."incoming_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_email_id_incoming_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."incoming_emails"("id") ON DELETE cascade ON UPDATE no action;