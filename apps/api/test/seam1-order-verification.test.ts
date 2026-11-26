import { afterEach, describe, expect, it } from "vitest";
import { FakeLlmClient } from "../src/llm/fake-llm-client";
import { extraction, issue } from "./support/extraction";
import { createInbox } from "./support/inbox";
import { ORDER_FIXTURE } from "./support/orders";
import { createPipeline } from "./support/pipeline";

describe("Seam 1: verifikasi order per Issue", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  /** Proses satu Email Masuk dengan Extraction tertentu, kembalikan detail Tiketnya. */
  async function processEmail(from: string, issues: ReturnType<typeof issue>[]) {
    const inbox = await createInbox();
    await inbox.add({ messageId: "<order@pelanggan.test>", from, subject: "Soal order", text: "Isi email" });
    const pipeline = await createPipeline({
      inboxDir: inbox.dir,
      llm: new FakeLlmClient(() => extraction({ issues })),
      orders: ORDER_FIXTURE,
    });
    close = pipeline.close;

    expect(await pipeline.processInbox()).toEqual({ processed: 1, skipped: 0, failed: 0 });
    const [summary] = await pipeline.tickets.list();
    const detail = await pipeline.tickets.findById(summary!.id);
    return detail!;
  }

  const orderNumber = (value: string) => ({ value, source: "body" });

  it("order cocok: order ditemukan, Pengirim = Pemilik Order (case-insensitive), status bayar dan kirim tampil", async () => {
    const ticket = await processEmail("Budi <budi.santoso@pelanggan.test>", [
      issue({ category: "barang_rusak", orderNumber: orderNumber("ORD-1001") }),
    ]);

    expect(ticket.issues[0]!.verification).toEqual({
      status: "ditemukan",
      isSenderOrderOwner: true,
      orderOwnerEmail: "Budi.Santoso@Pelanggan.TEST",
      order: {
        orderNumber: "ORD-1001",
        orderedAt: "2026-11-10T03:00:00.000Z",
        totalRupiah: 250_000,
        paymentStatus: "lunas",
        shippingStatus: "diterima",
        deliveredAt: "2026-11-14T07:30:00.000Z",
        items: [{ productName: "Vas Keramik", productCategory: "dekorasi_rumah", quantity: 2, unitPriceRupiah: 125_000 }],
        transactions: [
          {
            reference: "TRX-0001",
            method: "transfer_bank",
            amountRupiah: 250_000,
            status: "berhasil",
            createdAt: "2026-11-10T03:05:00.000Z",
          },
        ],
      },
    });
  });

  it("order tidak ada: nomor order yang disebut tidak ditemukan di database", async () => {
    const ticket = await processEmail("budi.santoso@pelanggan.test", [
      issue({ category: "pengiriman_bermasalah", orderNumber: orderNumber("ORD-9999") }),
    ]);

    expect(ticket.issues[0]!.verification).toEqual({ status: "tidak_ditemukan", orderNumber: "ORD-9999" });
  });

  it("Issue tanpa nomor order tidak diverifikasi", async () => {
    const ticket = await processEmail("budi.santoso@pelanggan.test", [issue({ orderNumber: null })]);

    expect(ticket.issues[0]!.verification).toEqual({ status: "tanpa_nomor" });
  });

  it("Pengirim bukan Pemilik Order: ditandai tidak cocok dan email Pemilik Order tersamar", async () => {
    const ticket = await processEmail("budi.santoso@pelanggan.test", [
      issue({ category: "refund", orderNumber: orderNumber("ORD-1002") }),
    ]);

    const verification = ticket.issues[0]!.verification;
    expect(verification).toMatchObject({
      status: "ditemukan",
      isSenderOrderOwner: false,
      orderOwnerEmail: "s***@pelanggan.test",
      order: { orderNumber: "ORD-1002", totalRupiah: 450_000, paymentStatus: "lunas", shippingStatus: "dikirim", deliveredAt: null },
    });
    expect(JSON.stringify(ticket)).not.toContain("sari@pelanggan.test");
  });

  it("dua order dalam satu Tiket: tiap Issue diverifikasi terhadap order-nya sendiri", async () => {
    const ticket = await processEmail("budi.santoso@pelanggan.test", [
      issue({ category: "barang_rusak", orderNumber: orderNumber("ORD-1001") }),
      issue({ category: "pengiriman_bermasalah", orderNumber: orderNumber("ORD-1002") }),
    ]);

    expect(ticket.issues.map((i) => i.verification)).toMatchObject([
      { status: "ditemukan", isSenderOrderOwner: true, order: { orderNumber: "ORD-1001", shippingStatus: "diterima" } },
      { status: "ditemukan", isSenderOrderOwner: false, order: { orderNumber: "ORD-1002", shippingStatus: "dikirim" } },
    ]);
  });
});
