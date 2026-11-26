import type { Kategori, Sentimen, StatusTiket, Urgensi } from "./domain";
import type { Ambigu, Bersumber, Penanda } from "./extraction";

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
