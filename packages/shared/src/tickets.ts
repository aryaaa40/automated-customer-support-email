import type { Kategori, Sentimen, StatusTiket, Urgensi } from "./domain";
import type { Ambigu, Bersumber, Penanda } from "./extraction";
import type {
  PaymentMethod,
  PaymentStatus,
  ProductCategory,
  ShippingStatus,
  TransactionStatus,
} from "./orders";

/** Bentuk respons API Tiket, dipakai bersama oleh API dan web. */

export interface TicketSummary {
  id: string;
  status: StatusTiket;
  sender: string;
  subject: string;
  receivedAt: string;
  categories: Kategori[];
  createdAt: string;
}

export interface IssueDto {
  id: string;
  category: Kategori;
  urgency: Urgensi;
  summary: string;
  orderNumber: Bersumber<string> | null;
  amount: Bersumber<number> | null;
  date: Bersumber<string> | null;
  productName: Bersumber<string> | null;
  verification: OrderVerificationDto;
}

/** Hasil verifikasi order untuk satu Issue. */
export type OrderVerificationDto =
  | { status: "tanpa_nomor" }
  | { status: "tidak_ditemukan"; orderNumber: string }
  | {
      status: "nomor_ambigu";
      orderNumber: string;
      /** Order milik Pengirim yang sama-sama mirip dengan `orderNumber`. */
      candidateOrderNumbers: string[];
    }
  | {
      status: "ditemukan";
      /** Pengirim sama dengan Pemilik Order (dibandingkan case-insensitive). */
      isSenderOrderOwner: boolean;
      /** Email Pemilik Order; tersamar (mis. `s***@pelanggan.example`) kalau bukan Pengirim. */
      orderOwnerEmail: string;
      /** Koreksi Nomor Order yang dipakai; null kalau nomor order cocok persis setelah normalisasi. */
      orderNumberCorrection: OrderNumberCorrectionDto | null;
      order: OrderDto;
    };

/** Koreksi Nomor Order: nomor yang disebut di email → order milik Pengirim yang dipakai. */
export interface OrderNumberCorrectionDto {
  originalOrderNumber: string;
  correctedOrderNumber: string;
}

/** Satu order di database order, dengan uang dalam integer rupiah. */
export interface OrderDto {
  orderNumber: string;
  orderedAt: string;
  totalRupiah: number;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  /** Tanggal barang diterima pelanggan; null kalau belum diterima. */
  deliveredAt: string | null;
  items: OrderItemDto[];
  transactions: PaymentTransactionDto[];
}

export interface OrderItemDto {
  productName: string;
  productCategory: ProductCategory;
  quantity: number;
  unitPriceRupiah: number;
}

export interface PaymentTransactionDto {
  reference: string;
  method: PaymentMethod;
  amountRupiah: number;
  status: TransactionStatus;
  createdAt: string;
}

export interface AttachmentDto {
  filename: string;
  contentType: string;
  size: number;
}

export interface TicketDetail {
  id: string;
  status: StatusTiket;
  sentiment: Sentimen;
  threat: Penanda;
  injectionAttempt: Penanda;
  ambiguous: Ambigu;
  createdAt: string;
  email: {
    messageId: string;
    sender: string;
    subject: string;
    body: string;
    receivedAt: string;
    attachments: AttachmentDto[];
  };
  issues: IssueDto[];
}
