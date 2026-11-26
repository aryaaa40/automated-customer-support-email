import MailComposer from "nodemailer/lib/mail-composer";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface EmailFixture {
  messageId: string;
  from: string;
  subject: string;
  text: string;
  date?: Date;
  attachments?: { filename: string; contentType: string; content: Buffer }[];
}

/** Folder inbox simulasi sementara yang diisi file .eml untuk satu test. */
export async function createInbox() {
  const dir = await mkdtemp(path.join(tmpdir(), "inbox-"));
  let counter = 0;
  return {
    dir,
    async add(email: EmailFixture) {
      const eml = await new MailComposer({
        messageId: email.messageId,
        from: email.from,
        to: "cs@example.com",
        subject: email.subject,
        text: email.text,
        date: email.date ?? new Date("2026-11-20T08:00:00Z"),
        attachments: email.attachments,
      })
        .compile()
        .build();
      counter += 1;
      await writeFile(path.join(dir, `${String(counter).padStart(3, "0")}.eml`), eml);
    },
    async addRaw(filename: string, content: string) {
      await writeFile(path.join(dir, filename), content);
    },
  };
}
