import { KATEGORI, SENTIMEN, STATUS_TIKET, URGENSI } from "@email-routing/shared";
import {
  bigint,
  boolean,
  customType,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const kategoriEnum = pgEnum("kategori", KATEGORI);
export const urgensiEnum = pgEnum("urgensi", URGENSI);
export const sentimenEnum = pgEnum("sentimen", SENTIMEN);
export const statusTiketEnum = pgEnum("status_tiket", STATUS_TIKET);

/** Email Masuk: data mentah apa adanya, selalu dianggap tidak tepercaya. */
export const incomingEmails = pgTable("incoming_emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Kunci idempotensi: satu Message-ID diproses sekali. */
  messageId: text("message_id").notNull().unique(),
  sender: text("sender").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailId: uuid("email_id")
    .notNull()
    .references(() => incomingEmails.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  content: bytea("content").notNull(),
});

/** Tiket: hasil pemrosesan satu Email Masuk (tepat satu per email). */
export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailId: uuid("email_id")
    .notNull()
    .unique()
    .references(() => incomingEmails.id, { onDelete: "cascade" }),
  status: statusTiketEnum("status").notNull(),
  sentiment: sentimenEnum("sentiment").notNull(),
  threat: boolean("threat").notNull(),
  threatEvidence: text("threat_evidence"),
  injectionAttempt: boolean("injection_attempt").notNull(),
  injectionEvidence: text("injection_evidence"),
  ambiguous: boolean("ambiguous").notNull(),
  ambiguousReason: text("ambiguous_reason"),
  /** Output Extraction mentah (sudah tervalidasi) untuk debugging dan eval. */
  extraction: jsonb("extraction").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Issue: satu masalah dalam sebuah Tiket, dengan tepat satu Kategori. */
export const issues = pgTable("issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  category: kategoriEnum("category").notNull(),
  urgency: urgensiEnum("urgency").notNull(),
  summary: text("summary").notNull(),
  orderNumber: text("order_number"),
  orderNumberSource: text("order_number_source"),
  amount: bigint("amount", { mode: "number" }),
  amountSource: text("amount_source"),
  date: text("date"),
  dateSource: text("date_source"),
  productName: text("product_name"),
  productNameSource: text("product_name_source"),
});
