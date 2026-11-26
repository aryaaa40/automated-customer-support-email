/** Lampiran yang menempel di Email Masuk. */
export interface Lampiran {
  filename: string;
  contentType: string;
  content: Buffer;
}

/** Satu Email Masuk yang sudah di-parse. Isinya selalu data tidak tepercaya. */
export interface IncomingEmail {
  messageId: string;
  /** Alamat Pengirim saja (tanpa nama tampilan), huruf kecil. */
  sender: string;
  subject: string;
  body: string;
  receivedAt: Date;
  attachments: Lampiran[];
}

/** Penunjuk ke satu email di sumbernya (misalnya nama file atau UID IMAP). */
export interface EmailRef {
  id: string;
}

/**
 * Sumber Email Masuk. Implementasi pertama FileSource (folder inbox simulasi);
 * IMAP bisa ditambahkan kelak tanpa mengubah Ingestion.
 */
export interface EmailSource {
  list(): Promise<EmailRef[]>;
  read(ref: EmailRef): Promise<IncomingEmail>;
}

export const EMAIL_SOURCE = Symbol("EMAIL_SOURCE");

/** Email tidak bisa diproses. Pesannya ditulis sistem dan aman masuk log. */
export class EmailRejected extends Error {
  override name = "EmailRejected";
}
