/** Hasil verifikasi order untuk satu Issue, disimpan bersama Issue-nya. */
export type OrderVerification =
  | { status: "tanpa_nomor" }
  | { status: "tidak_ditemukan" }
  | { status: "ditemukan"; orderNumber: string; isSenderOrderOwner: boolean };

/** Data order yang dibutuhkan verifikasi: nomor order dan email Pemilik Order. */
export interface OrderOwnership {
  orderNumber: string;
  orderOwnerEmail: string;
}

/**
 * Verifikasi order untuk satu Issue (ADR-0001: kode yang memutuskan, bukan
 * LLM): cari nomor order di `ordersByNumber`, lalu cek apakah Pengirim adalah
 * Pemilik Order. Fungsi murni; pemanggil yang mengambil order dari database.
 *
 * Normalisasi nomor order dan Koreksi Nomor Order menyusul di #4.
 */
export function verifyOrder(
  sender: string,
  orderNumber: string | null,
  ordersByNumber: ReadonlyMap<string, OrderOwnership>,
): OrderVerification {
  if (orderNumber === null) return { status: "tanpa_nomor" };

  const order = ordersByNumber.get(orderNumber);
  if (!order) return { status: "tidak_ditemukan" };

  return {
    status: "ditemukan",
    orderNumber: order.orderNumber,
    isSenderOrderOwner: isSenderOrderOwner(sender, order.orderOwnerEmail),
  };
}

/** Pengirim sama dengan Pemilik Order; alamat email dibandingkan case-insensitive. */
export function isSenderOrderOwner(sender: string, orderOwnerEmail: string): boolean {
  return sender.trim().toLowerCase() === orderOwnerEmail.trim().toLowerCase();
}
