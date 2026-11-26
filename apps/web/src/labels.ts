import type {
  Kategori,
  PaymentMethod,
  PaymentStatus,
  ProductCategory,
  Sentimen,
  ShippingStatus,
  StatusTiket,
  TransactionStatus,
  Urgensi,
} from "@email-routing/shared";

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

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  menunggu: "Menunggu pembayaran",
  lunas: "Lunas",
  gagal: "Gagal",
  dikembalikan: "Dana dikembalikan",
};

export const shippingStatusLabel: Record<ShippingStatus, string> = {
  belum_dikirim: "Belum dikirim",
  diproses: "Diproses",
  dikirim: "Dikirim",
  diterima: "Diterima",
};

export const productCategoryLabel: Record<ProductCategory, string> = {
  elektronik: "Elektronik",
  peralatan_dapur: "Peralatan Dapur",
  fashion: "Fashion",
  dekorasi_rumah: "Dekorasi Rumah",
  kecantikan: "Kecantikan",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  transfer_bank: "Transfer bank",
  virtual_account: "Virtual account",
  kartu_kredit: "Kartu kredit",
  e_wallet: "E-wallet",
};

export const transactionStatusLabel: Record<TransactionStatus, string> = {
  berhasil: "Berhasil",
  gagal: "Gagal",
  menunggu: "Menunggu",
};

export const formatRupiah = (amount: number) => `Rp${amount.toLocaleString("id-ID")}`;

export const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
