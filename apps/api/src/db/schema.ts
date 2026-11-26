import {
  KATEGORI,
  ORDER_VERIFICATION_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRODUCT_CATEGORIES,
  SENTIMEN,
  SHIPPING_STATUSES,
  STATUS_TIKET,
  TRANSACTION_STATUSES,
  URGENSI,
} from "@email-routing/shared";
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
export const orderVerificationStatusEnum = pgEnum("order_verification_status", ORDER_VERIFICATION_STATUSES);
export const productCategoryEnum = pgEnum("product_category", PRODUCT_CATEGORIES);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);
export const shippingStatusEnum = pgEnum("shipping_status", SHIPPING_STATUSES);
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);
export const transactionStatusEnum = pgEnum("transaction_status", TRANSACTION_STATUSES);

// ---------------------------------------------------------------------------
// Database order (diisi seed). Issue merujuk order lewat nomor order, bukan
// foreign key, supaya seed bisa dijalankan ulang tanpa menyentuh Tiket.
// ---------------------------------------------------------------------------

/** Pelanggan; yang tercatat di sebuah order adalah Pemilik Order. */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

/** Produk; kategori produk menentukan masa garansi (#8). */
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: productCategoryEnum("category").notNull(),
  priceRupiah: bigint("price_rupiah", { mode: "number" }).notNull(),
});

/** Order; `customerId` menunjuk Pemilik Order. */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  orderedAt: timestamp("ordered_at", { withTimezone: true }).notNull(),
  /** Jumlah quantity × harga satuan semua item. */
  totalRupiah: bigint("total_rupiah", { mode: "number" }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull(),
  shippingStatus: shippingStatusEnum("shipping_status").notNull(),
  /** Tanggal diterima pelanggan; null kalau belum diterima. */
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  /** Harga satuan saat order dibuat (bisa berbeda dari harga produk sekarang). */
  unitPriceRupiah: bigint("unit_price_rupiah", { mode: "number" }).notNull(),
});

/** Transaksi pembayaran sebuah order; satu order bisa punya beberapa (gagal lalu berhasil, double charge). */
export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  reference: text("reference").notNull().unique(),
  method: paymentMethodEnum("method").notNull(),
  amountRupiah: bigint("amount_rupiah", { mode: "number" }).notNull(),
  status: transactionStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

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
  /** Hasil Order Verifier, disimpan saat ingestion supaya aturan Flag Review bisa ditelusuri. */
  orderVerification: orderVerificationStatusEnum("order_verification").notNull(),
  /** Nomor order di database yang cocok; null kalau tidak ditemukan atau tanpa nomor. */
  verifiedOrderNumber: text("verified_order_number"),
  /** Pengirim sama dengan Pemilik Order; null kalau order tidak ditemukan. */
  isSenderOrderOwner: boolean("is_sender_order_owner"),
  /** Order ditemukan lewat Koreksi Nomor Order; null kalau order tidak ditemukan. */
  isOrderNumberCorrected: boolean("is_order_number_corrected"),
  /** Order milik Pengirim yang sama-sama mirip; hanya terisi kalau nomor order ambigu. */
  candidateOrderNumbers: text("candidate_order_numbers").array(),
});
