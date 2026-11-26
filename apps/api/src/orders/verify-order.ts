import { findCorrectionCandidates, normalizeOrderNumber } from "./correct-order-number";

/** Hasil verifikasi order untuk satu Issue, disimpan bersama Issue-nya. */
export type OrderVerification =
  | { status: "tanpa_nomor" }
  | { status: "tidak_ditemukan" }
  | {
      status: "nomor_ambigu";
      /** Order milik Pengirim yang sama-sama mirip; tidak ada yang dipilih. */
      candidateOrderNumbers: string[];
    }
  | {
      status: "ditemukan";
      orderNumber: string;
      isSenderOrderOwner: boolean;
      /** Nomor order didapat lewat Koreksi Nomor Order, bukan cocok persis. */
      isOrderNumberCorrected: boolean;
    };

/** Data order yang dibutuhkan verifikasi: nomor order dan email Pemilik Order. */
export interface OrderOwnership {
  orderNumber: string;
  orderOwnerEmail: string;
}

/** Data order yang disiapkan pemanggil untuk memverifikasi satu Email Masuk. */
export interface OrderLookup {
  /** Order yang nomornya cocok persis dengan nomor order yang sudah dinormalisasi. */
  ordersByNumber: ReadonlyMap<string, OrderOwnership>;
  /** Semua nomor order milik Pengirim, sumber kandidat Koreksi Nomor Order. */
  senderOrderNumbers: readonly string[];
}

/**
 * Verifikasi order untuk satu Issue (ADR-0001: kode yang memutuskan, bukan
 * LLM). Nomor order dinormalisasi lalu dicari persis; kalau tidak ada,
 * dicari order milik Pengirim yang berjarak edit ≤ 1. Tepat satu kandidat
 * dipakai sebagai Koreksi Nomor Order, lebih dari satu berarti nomor order
 * ambigu. Fungsi murni; pemanggil yang mengambil order dari database.
 */
export function verifyOrder(sender: string, orderNumber: string | null, lookup: OrderLookup): OrderVerification {
  if (orderNumber === null) return { status: "tanpa_nomor" };

  const normalizedOrderNumber = normalizeOrderNumber(orderNumber);
  const order = lookup.ordersByNumber.get(normalizedOrderNumber);
  if (order) {
    return {
      status: "ditemukan",
      orderNumber: order.orderNumber,
      isSenderOrderOwner: isSenderOrderOwner(sender, order.orderOwnerEmail),
      isOrderNumberCorrected: false,
    };
  }

  const candidates = findCorrectionCandidates(normalizedOrderNumber, lookup.senderOrderNumbers);
  if (candidates.length === 0) return { status: "tidak_ditemukan" };
  if (candidates.length > 1) return { status: "nomor_ambigu", candidateOrderNumbers: candidates };
  // Kandidat diambil dari order milik Pengirim, jadi Pengirim pasti Pemilik Order-nya.
  return { status: "ditemukan", orderNumber: candidates[0]!, isSenderOrderOwner: true, isOrderNumberCorrected: true };
}

/** Pengirim sama dengan Pemilik Order; alamat email dibandingkan case-insensitive. */
export function isSenderOrderOwner(sender: string, orderOwnerEmail: string): boolean {
  return sender.trim().toLowerCase() === orderOwnerEmail.trim().toLowerCase();
}
