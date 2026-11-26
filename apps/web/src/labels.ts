import type { Kategori, Sentimen, StatusTiket, Urgensi } from "@email-routing/shared";

export const kategoriLabel: Record<Kategori, string> = {
  barang_rusak: "Barang Rusak",
  salah_kirim: "Salah Kirim",
  pengiriman_bermasalah: "Pengiriman Bermasalah",
  refund: "Refund",
  masalah_pembayaran: "Masalah Pembayaran",
  masalah_akun: "Masalah Akun",
  pertanyaan_produk: "Pertanyaan Produk",
  spam: "Spam",
};

export const statusLabel: Record<StatusTiket, string> = {
  antrian_review: "Antrian Review",
  diteruskan: "Diteruskan",
  selesai: "Selesai",
  diarsipkan: "Diarsipkan",
};

export const urgensiLabel: Record<Urgensi, string> = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  kritis: "Kritis",
};

export const sentimenLabel: Record<Sentimen, string> = {
  positif: "Positif",
  netral: "Netral",
  kesal: "Kesal",
  marah: "Marah",
};

export const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
