import type { OrderVerificationDto, OrderVerificationStatus } from "@email-routing/shared";
import type { OrderRecord } from "./orders.service";

/** Hasil verifikasi yang tersimpan di satu Issue. */
export interface StoredOrderVerification {
  orderVerification: OrderVerificationStatus;
  orderNumber: string | null;
  verifiedOrderNumber: string | null;
  isSenderOrderOwner: boolean | null;
}

/**
 * Hasil verifikasi untuk ditampilkan: status yang tersimpan saat ingestion,
 * dilengkapi data order terkini. Email Pemilik Order disamarkan kalau bukan
 * Pengirim, supaya data pelanggan lain tidak terbuka begitu saja.
 */
export function toOrderVerificationDto(
  stored: StoredOrderVerification,
  ordersByNumber: ReadonlyMap<string, OrderRecord>,
): OrderVerificationDto {
  if (stored.orderVerification === "tanpa_nomor" || stored.orderNumber === null) {
    return { status: "tanpa_nomor" };
  }
  const record = stored.verifiedOrderNumber ? ordersByNumber.get(stored.verifiedOrderNumber) : undefined;
  // Order bisa hilang kalau database order di-seed ulang dengan data lain.
  if (stored.orderVerification === "tidak_ditemukan" || !record) {
    return { status: "tidak_ditemukan", orderNumber: stored.orderNumber };
  }
  const { orderOwnerEmail, ...order } = record;
  const isSenderOrderOwner = stored.isSenderOrderOwner === true;
  return {
    status: "ditemukan",
    isSenderOrderOwner,
    orderOwnerEmail: isSenderOrderOwner ? orderOwnerEmail : maskEmail(orderOwnerEmail),
    order,
  };
}

/** Samarkan email: `sari@pelanggan.example` → `s***@pelanggan.example`. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
