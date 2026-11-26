import { z } from "zod";

/** Kategori: daftar tetap jenis masalah (GLOSSARY.md). */
export const KATEGORI = [
  "barang_rusak",
  "salah_kirim",
  "pengiriman_bermasalah",
  "refund",
  "masalah_pembayaran",
  "masalah_akun",
  "pertanyaan_produk",
  "spam",
] as const;
export const KategoriSchema = z.enum(KATEGORI);
export type Kategori = z.infer<typeof KategoriSchema>;

/** Urgensi: seberapa mendesak sebuah Issue secara objektif. */
export const URGENSI = ["rendah", "sedang", "tinggi", "kritis"] as const;
export const UrgensiSchema = z.enum(URGENSI);
export type Urgensi = z.infer<typeof UrgensiSchema>;

/** Sentimen: emosi pelanggan di level Tiket. */
export const SENTIMEN = ["positif", "netral", "kesal", "marah"] as const;
export const SentimenSchema = z.enum(SENTIMEN);
export type Sentimen = z.infer<typeof SentimenSchema>;

/** Status Tiket (spec: Ticket Workflow API). */
export const STATUS_TIKET = ["antrian_review", "diteruskan", "selesai", "diarsipkan"] as const;
export const StatusTiketSchema = z.enum(STATUS_TIKET);
export type StatusTiket = z.infer<typeof StatusTiketSchema>;
