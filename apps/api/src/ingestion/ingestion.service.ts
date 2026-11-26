import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Extraction } from "@email-routing/shared";
import { ZodError } from "zod";
import {
  EMAIL_SOURCE,
  EmailRejected,
  type EmailRef,
  type EmailSource,
} from "../email-source/email-source";
import { Extractor } from "../extraction/extractor";
import { maskIncomingEmail } from "../masking/mask-sensitive-data";
import { normalizeOrderNumber } from "../orders/correct-order-number";
import { OrdersService } from "../orders/orders.service";
import { type OrderVerification, verifyOrder } from "../orders/verify-order";
import { TicketsService } from "../tickets/tickets.service";

export interface IngestionResult {
  processed: number;
  skipped: number;
  failed: number;
}

const CONCURRENCY = 5;

/**
 * Memproses semua Email Masuk yang belum diproses menjadi Tiket.
 * Idempoten per Message-ID; satu email gagal tidak menghentikan batch.
 * Log hanya memuat penunjuk email dan jenis kesalahan, tidak pernah isinya.
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @Inject(EMAIL_SOURCE) private readonly source: EmailSource,
    private readonly extractor: Extractor,
    private readonly orders: OrdersService,
    private readonly tickets: TicketsService,
  ) {}

  async processInbox(): Promise<IngestionResult> {
    const result: IngestionResult = { processed: 0, skipped: 0, failed: 0 };
    const refs = await this.source.list();

    await forEachWithConcurrency(refs, CONCURRENCY, async (ref) => {
      const outcome = await this.processOne(ref);
      result[outcome] += 1;
    });

    this.logger.log(
      `Selesai: ${result.processed} diproses, ${result.skipped} dilewati, ${result.failed} gagal`,
    );
    return result;
  }

  private async processOne(ref: EmailRef): Promise<keyof IngestionResult> {
    try {
      const email = await this.source.read(ref);
      if (await this.tickets.hasProcessed(email.messageId)) return "skipped";

      // Hanya prompt yang disamarkan; Tiket menyimpan email asli untuk Staf CS.
      const extraction = await this.extractor.extract(maskIncomingEmail(email));
      const verifications = await this.verifyOrders(email.sender, extraction);
      const created = await this.tickets.createFromExtraction(email, extraction, verifications);
      return created ? "processed" : "skipped";
    } catch (error) {
      this.logger.error(`Gagal memproses email ${ref.id}: ${describeError(error)}`);
      return "failed";
    }
  }

  /** Verifikasi per Issue: tiap Issue dicek terhadap order-nya sendiri (ADR-0002). */
  private async verifyOrders(sender: string, extraction: Extraction): Promise<OrderVerification[]> {
    const orderNumbers = extraction.issues.flatMap((issue) =>
      issue.orderNumber ? [normalizeOrderNumber(issue.orderNumber.value)] : [],
    );
    const [ordersByNumber, senderOrderNumbers] = await Promise.all([
      this.orders.findByNumbers(orderNumbers),
      this.orders.listOrderNumbersByOwner(sender),
    ]);
    const lookup = { ordersByNumber, senderOrderNumbers };
    return extraction.issues.map((issue) => verifyOrder(sender, issue.orderNumber?.value ?? null, lookup));
  }
}

/**
 * Deskripsi kesalahan yang aman untuk log. Pesan dari parser, database, atau
 * LLM bisa menyalin isi email, jadi hanya pesan buatan sistem sendiri yang
 * ditulis utuh; selebihnya cukup jenis dan kodenya.
 */
function describeError(error: unknown): string {
  if (error instanceof EmailRejected) return `${error.name}: ${error.message}`;
  if (error instanceof ZodError) {
    const issues = error.issues.map((i) => `${i.path.join(".") || "(root)"}:${i.code}`);
    return `Extraction tidak valid [${issues.join(", ")}]`;
  }
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? `${error.name} (${code})` : error.name;
  }
  return "kesalahan tidak dikenal";
}

async function forEachWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++]!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}
