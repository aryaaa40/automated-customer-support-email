/** Kategori produk, dipakai Aturan Terhitung untuk masa garansi (#8). */
export const PRODUCT_CATEGORIES = [
  "elektronik",
  "peralatan_dapur",
  "fashion",
  "dekorasi_rumah",
  "kecantikan",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Status pembayaran sebuah order. */
export const PAYMENT_STATUSES = ["menunggu", "lunas", "gagal", "dikembalikan"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Status pengiriman sebuah order. */
export const SHIPPING_STATUSES = ["belum_dikirim", "diproses", "dikirim", "diterima"] as const;
export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

/** Metode satu transaksi pembayaran. */
export const PAYMENT_METHODS = ["transfer_bank", "virtual_account", "kartu_kredit", "e_wallet"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Status satu transaksi pembayaran. */
export const TRANSACTION_STATUSES = ["berhasil", "gagal", "menunggu"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/**
 * Status verifikasi order untuk satu Issue.
 * - `tanpa_nomor`: Issue tidak menyebut nomor order.
 * - `ditemukan`: nomor order ada di database.
 * - `tidak_ditemukan`: nomor order disebut tapi tidak ada di database, dan
 *   tidak ada order milik Pengirim yang mirip.
 * - `nomor_ambigu`: tidak ada yang cocok persis, dan lebih dari satu order
 *   milik Pengirim sama-sama mirip, jadi tidak dikoreksi.
 */
export const ORDER_VERIFICATION_STATUSES = ["tanpa_nomor", "ditemukan", "tidak_ditemukan", "nomor_ambigu"] as const;
export type OrderVerificationStatus = (typeof ORDER_VERIFICATION_STATUSES)[number];
