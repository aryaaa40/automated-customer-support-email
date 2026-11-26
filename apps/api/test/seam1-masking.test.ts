import { afterEach, describe, expect, it } from "vitest";
import { FakeLlmClient } from "../src/llm/fake-llm-client";
import { extraction } from "./support/extraction";
import { createInbox } from "./support/inbox";
import { createPipeline } from "./support/pipeline";

/** Nilai sensitif di email fixture, dalam bentuk tertulis dan bentuk angka saja. */
const SENSITIVE_VALUES = [
  "4111 1111 1111 1111",
  "4111111111111111",
  "1234567890",
  "123-456-7890",
  "0812-3456-7890",
  "081234567890",
  "+62 812 3456 7890",
  "81234567890",
  "Melati",
  "Sukamaju",
  "40123",
];

describe("Seam 1: masking data sensitif sebelum prompt LLM", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it("prompt yang diterima LLM tidak memuat nilai sensitif, tapi nomor order dan nominal tetap ada", async () => {
    const inbox = await createInbox();
    await inbox.add({
      messageId: "<pii-1@pelanggan.test>",
      from: "Rina <rina@pelanggan.test>",
      subject: "Refund ORD-1023 ke rekening 1234567890",
      text: [
        "Halo, pesanan ORD-1023 senilai Rp1.250.000 terdebet dua kali dari kartu 4111 1111 1111 1111.",
        "Mohon refund ke rekening BCA 123-456-7890 a.n. Rina.",
        "Hubungi saya di 0812-3456-7890 atau WA +62 812 3456 7890.",
        "",
        "Alamat pengiriman:",
        "Jl. Melati No. 5",
        "RT 02/RW 03, Kel. Sukamaju",
        "Kota Bandung 40123",
      ].join("\n"),
    });
    const llm = new FakeLlmClient(() => extraction());
    const pipeline = await createPipeline({ inboxDir: inbox.dir, llm });
    close = pipeline.close;

    await pipeline.processInbox();

    expect(llm.prompts).toHaveLength(1);
    const prompt = llm.prompts[0]!;
    const promptText = `${prompt.system}\n${prompt.user}`;
    for (const value of SENSITIVE_VALUES) {
      expect(promptText).not.toContain(value);
    }
    expect(prompt.user).toContain("Subjek: Refund ORD-1023 ke rekening [REKENING_1]");
    expect(prompt.user).toContain(
      "Halo, pesanan ORD-1023 senilai Rp1.250.000 terdebet dua kali dari kartu [KARTU_1].",
    );
    expect(prompt.user).toContain("Mohon refund ke rekening BCA [REKENING_1] a.n. Rina.");
    expect(prompt.user).toContain("Hubungi saya di [HP_1] atau WA [HP_1].");
    expect(prompt.user).toContain("Alamat pengiriman:\n[ALAMAT_1]");
  });

  it("menyimpan email asli di Tiket supaya Staf CS tetap melihat nilainya", async () => {
    const inbox = await createInbox();
    await inbox.add({
      messageId: "<pii-2@pelanggan.test>",
      from: "dodi@pelanggan.test",
      subject: "Ganti nomor HP",
      text: "Nomor HP saya sekarang 0812-3456-7890.",
    });
    const llm = new FakeLlmClient(() => extraction());
    const pipeline = await createPipeline({ inboxDir: inbox.dir, llm });
    close = pipeline.close;

    await pipeline.processInbox();

    expect(llm.prompts[0]!.user).toContain("Nomor HP saya sekarang [HP_1].");
    const [ticket] = await pipeline.tickets.list();
    const detail = await pipeline.tickets.findById(ticket!.id);
    expect(detail?.email.body).toContain("Nomor HP saya sekarang 0812-3456-7890.");
  });
});
