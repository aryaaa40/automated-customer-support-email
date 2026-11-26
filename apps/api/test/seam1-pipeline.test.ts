import { afterEach, describe, expect, it } from "vitest";
import { FakeLlmClient } from "../src/llm/fake-llm-client";
import { extraction, issue } from "./support/extraction";
import { createInbox } from "./support/inbox";
import { createPipeline } from "./support/pipeline";

describe("Seam 1: Email Masuk → Tiket (LLM palsu)", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it("menyimpan satu Tiket berisi Issue dari Extraction untuk satu Email Masuk", async () => {
    const inbox = await createInbox();
    await inbox.add({
      messageId: "<rusak-1@pelanggan.test>",
      from: "Budi Santoso <budi@pelanggan.test>",
      subject: "Barang pecah",
      text: "Halo, vas yang saya terima pecah. Invoice terlampir.",
      date: new Date("2026-11-20T08:00:00Z"),
      attachments: [
        { filename: "invoice.pdf", contentType: "application/pdf", content: Buffer.from("%PDF-1.4 fake") },
      ],
    });
    const llm = new FakeLlmClient(() =>
      extraction({
        sentiment: "kesal",
        issues: [
          issue({
            category: "barang_rusak",
            urgency: "sedang",
            summary: "Pelanggan menerima vas dalam kondisi pecah",
            orderNumber: { value: "ORD-1023", source: "lampiran:invoice.pdf" },
            productName: { value: "Vas Keramik", source: "body" },
          }),
        ],
      }),
    );
    const pipeline = await createPipeline({ inboxDir: inbox.dir, llm });
    close = pipeline.close;

    const result = await pipeline.processInbox();

    expect(result).toEqual({ processed: 1, skipped: 0, failed: 0 });
    const list = await pipeline.tickets.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      sender: "budi@pelanggan.test",
      subject: "Barang pecah",
      status: "antrian_review",
      categories: ["barang_rusak"],
    });

    const detail = await pipeline.tickets.findById(list[0]!.id);
    expect(detail).toMatchObject({
      sentiment: "kesal",
      email: {
        messageId: "<rusak-1@pelanggan.test>",
        sender: "budi@pelanggan.test",
        body: expect.stringContaining("vas yang saya terima pecah"),
        receivedAt: "2026-11-20T08:00:00.000Z",
        attachments: [{ filename: "invoice.pdf", contentType: "application/pdf", size: 13 }],
      },
      issues: [
        {
          category: "barang_rusak",
          urgency: "sedang",
          summary: "Pelanggan menerima vas dalam kondisi pecah",
          orderNumber: { value: "ORD-1023", source: "lampiran:invoice.pdf" },
          amount: null,
          date: null,
          productName: { value: "Vas Keramik", source: "body" },
        },
      ],
    });
  });

  it("tidak membuat Tiket ganda ketika inbox diproses dua kali (Message-ID)", async () => {
    const inbox = await createInbox();
    await inbox.add({
      messageId: "<tanya-1@pelanggan.test>",
      from: "sari@pelanggan.test",
      subject: "Stok ukuran L",
      text: "Kaos hitam ukuran L masih ada?",
    });
    const llm = new FakeLlmClient(() => extraction());
    const pipeline = await createPipeline({ inboxDir: inbox.dir, llm });
    close = pipeline.close;

    const first = await pipeline.processInbox();
    const second = await pipeline.processInbox();

    expect(first).toEqual({ processed: 1, skipped: 0, failed: 0 });
    expect(second).toEqual({ processed: 0, skipped: 1, failed: 0 });
    expect(await pipeline.tickets.list()).toHaveLength(1);
    expect(llm.prompts).toHaveLength(1);
  });

  it("mencatat email yang gagal, melanjutkan batch, dan tidak menulis isi email ke log", async () => {
    const inbox = await createInbox();
    await inbox.add({
      messageId: "<gagal-llm@pelanggan.test>",
      from: "rina@pelanggan.test",
      subject: "Rekening saya 1234567890",
      text: "Transfer dari rekening 1234567890 atas nama Rina belum masuk.",
    });
    await inbox.add({
      messageId: "<ok@pelanggan.test>",
      from: "dodi@pelanggan.test",
      subject: "Tanya garansi",
      text: "Garansi blender berapa lama?",
    });
    // Email rusak: tanpa Message-ID, tidak bisa diproses secara idempoten.
    await inbox.addRaw(
      "999-tanpa-message-id.eml",
      "From: anon@pelanggan.test\r\nSubject: Alamat Jl. Melati 5\r\nDate: Fri, 20 Nov 2026 08:00:00 +0000\r\n\r\nKirim ke Jl. Melati 5\r\n",
    );
    const llm = new FakeLlmClient((prompt) =>
      prompt.user.includes("1234567890")
        ? // Output LLM yang tidak valid dan menyalin isi email ke field-nya.
          extraction({ sentiment: "rekening 1234567890" as never })
        : extraction(),
    );
    const pipeline = await createPipeline({ inboxDir: inbox.dir, llm });
    close = pipeline.close;

    const result = await pipeline.processInbox();

    expect(result).toEqual({ processed: 1, skipped: 0, failed: 2 });
    const list = await pipeline.tickets.list();
    expect(list.map((t) => t.sender)).toEqual(["dodi@pelanggan.test"]);

    const log = pipeline.logger.lines.join("\n");
    expect(log).toContain("001.eml");
    expect(log).toContain("999-tanpa-message-id.eml");
    for (const content of ["1234567890", "Rina", "Melati", "Rekening saya"]) {
      expect(log).not.toContain(content);
    }
  });
});
