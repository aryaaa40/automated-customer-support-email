import { simpleParser } from "mailparser";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { EmailRejected, type EmailRef, type EmailSource, type IncomingEmail } from "./email-source";

/** Membaca file .eml dari folder inbox simulasi, urut nama file. */
export class FileSource implements EmailSource {
  constructor(private readonly dir: string) {}

  async list(): Promise<EmailRef[]> {
    const files = await readdir(this.dir);
    return files
      .filter((f) => f.toLowerCase().endsWith(".eml"))
      .sort()
      .map((id) => ({ id }));
  }

  async read(ref: EmailRef): Promise<IncomingEmail> {
    const parsed = await simpleParser(await readFile(path.join(this.dir, ref.id)));
    const sender = parsed.from?.value[0]?.address;
    if (!parsed.messageId) throw new EmailRejected("Message-ID tidak ada");
    if (!sender) throw new EmailRejected("Pengirim tidak ada");
    if (!parsed.date) throw new EmailRejected("Header Date tidak ada");

    return {
      messageId: parsed.messageId,
      sender: sender.toLowerCase(),
      subject: parsed.subject ?? "",
      body: parsed.text ?? "",
      receivedAt: parsed.date,
      attachments: parsed.attachments.map((a, i) => ({
        filename: a.filename ?? `lampiran-${i + 1}`,
        contentType: a.contentType,
        content: a.content,
      })),
    };
  }
}
