import type {
  Bersumber,
  Extraction,
  TicketDetail,
  TicketSummary,
} from "@email-routing/shared";
import { Inject, Injectable } from "@nestjs/common";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { DATABASE, type Database } from "../db/database";
import { attachments, incomingEmails, issues, tickets } from "../db/schema";
import type { IncomingEmail } from "../email-source/email-source";
import { OrdersService } from "../orders/orders.service";
import { toOrderVerificationDto } from "../orders/to-order-verification-dto";
import type { OrderVerification } from "../orders/verify-order";

@Injectable()
export class TicketsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly orders: OrdersService,
  ) {}

  async hasProcessed(messageId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: incomingEmails.id })
      .from(incomingEmails)
      .where(eq(incomingEmails.messageId, messageId))
      .limit(1);
    return rows.length > 0;
  }

  /**
   * Simpan Email Masuk beserta Tiket dan Issue-nya dalam satu transaksi.
   * `verifications[i]` adalah hasil verifikasi order untuk `extraction.issues[i]`.
   * Mengembalikan false kalau Message-ID sudah pernah tersimpan.
   */
  async createFromExtraction(
    email: IncomingEmail,
    extraction: Extraction,
    verifications: OrderVerification[],
  ): Promise<boolean> {
    if (verifications.length !== extraction.issues.length) {
      throw new Error("Jumlah hasil verifikasi order tidak sama dengan jumlah Issue");
    }
    return this.db.transaction(async (tx) => {
      const [saved] = await tx
        .insert(incomingEmails)
        .values({
          messageId: email.messageId,
          sender: email.sender,
          subject: email.subject,
          body: email.body,
          receivedAt: email.receivedAt,
        })
        .onConflictDoNothing({ target: incomingEmails.messageId })
        .returning({ id: incomingEmails.id });
      if (!saved) return false;

      if (email.attachments.length > 0) {
        await tx.insert(attachments).values(
          email.attachments.map((a) => ({
            emailId: saved.id,
            filename: a.filename,
            contentType: a.contentType,
            size: a.content.length,
            content: a.content,
          })),
        );
      }

      const [ticket] = await tx
        .insert(tickets)
        .values({
          emailId: saved.id,
          // Rules Engine (#6) belum ada: default aman adalah ditahan untuk review manusia.
          status: "antrian_review",
          sentiment: extraction.sentiment,
          threat: extraction.threat.present,
          threatEvidence: extraction.threat.evidence,
          injectionAttempt: extraction.injectionAttempt.present,
          injectionEvidence: extraction.injectionAttempt.evidence,
          ambiguous: extraction.ambiguous.isAmbiguous,
          ambiguousReason: extraction.ambiguous.reason,
          extraction,
        })
        .returning({ id: tickets.id });

      await tx.insert(issues).values(
        extraction.issues.map((issue, position) => ({
          ...toVerificationColumns(verifications[position]!),
          ticketId: ticket!.id,
          position,
          category: issue.category,
          urgency: issue.urgency,
          summary: issue.summary,
          orderNumber: issue.orderNumber?.value,
          orderNumberSource: issue.orderNumber?.source,
          amount: issue.amount?.value,
          amountSource: issue.amount?.source,
          date: issue.date?.value,
          dateSource: issue.date?.source,
          productName: issue.productName?.value,
          productNameSource: issue.productName?.source,
        })),
      );
      return true;
    });
  }

  async list(): Promise<TicketSummary[]> {
    const rows = await this.db
      .select({
        id: tickets.id,
        status: tickets.status,
        createdAt: tickets.createdAt,
        sender: incomingEmails.sender,
        subject: incomingEmails.subject,
        receivedAt: incomingEmails.receivedAt,
      })
      .from(tickets)
      .innerJoin(incomingEmails, eq(tickets.emailId, incomingEmails.id))
      .orderBy(desc(incomingEmails.receivedAt));
    if (rows.length === 0) return [];

    const issueRows = await this.db
      .select({ ticketId: issues.ticketId, category: issues.category })
      .from(issues)
      .where(inArray(issues.ticketId, rows.map((r) => r.id)))
      .orderBy(asc(issues.position));

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      sender: r.sender,
      subject: r.subject,
      receivedAt: r.receivedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      categories: issueRows.filter((i) => i.ticketId === r.id).map((i) => i.category),
    }));
  }

  async findById(id: string): Promise<TicketDetail | null> {
    const [row] = await this.db
      .select({ ticket: tickets, email: incomingEmails })
      .from(tickets)
      .innerJoin(incomingEmails, eq(tickets.emailId, incomingEmails.id))
      .where(eq(tickets.id, id));
    if (!row) return null;
    const { ticket, email } = row;

    const [attachmentRows, issueRows] = await Promise.all([
      this.db
        .select({
          filename: attachments.filename,
          contentType: attachments.contentType,
          size: attachments.size,
        })
        .from(attachments)
        .where(eq(attachments.emailId, email.id))
        .orderBy(asc(attachments.filename)),
      this.db.select().from(issues).where(eq(issues.ticketId, ticket.id)).orderBy(asc(issues.position)),
    ]);

    const verifiedNumbers = issueRows.flatMap((i) => (i.verifiedOrderNumber ? [i.verifiedOrderNumber] : []));
    const ordersByNumber = await this.orders.findByNumbers(verifiedNumbers);

    return {
      id: ticket.id,
      status: ticket.status,
      sentiment: ticket.sentiment,
      threat: { present: ticket.threat, evidence: ticket.threatEvidence },
      injectionAttempt: { present: ticket.injectionAttempt, evidence: ticket.injectionEvidence },
      ambiguous: { isAmbiguous: ticket.ambiguous, reason: ticket.ambiguousReason },
      createdAt: ticket.createdAt.toISOString(),
      email: {
        messageId: email.messageId,
        sender: email.sender,
        subject: email.subject,
        body: email.body,
        receivedAt: email.receivedAt.toISOString(),
        attachments: attachmentRows,
      },
      issues: issueRows.map((i) => ({
        id: i.id,
        category: i.category,
        urgency: i.urgency,
        summary: i.summary,
        orderNumber: toBersumber(i.orderNumber, i.orderNumberSource),
        amount: toBersumber(i.amount, i.amountSource),
        date: toBersumber(i.date, i.dateSource),
        productName: toBersumber(i.productName, i.productNameSource),
        verification: toOrderVerificationDto(i, ordersByNumber),
      })),
    };
  }
}

/** Kolom Issue yang menyimpan hasil verifikasi order. */
function toVerificationColumns(verification: OrderVerification) {
  const isFound = verification.status === "ditemukan";
  return {
    orderVerification: verification.status,
    verifiedOrderNumber: isFound ? verification.orderNumber : null,
    isSenderOrderOwner: isFound ? verification.isSenderOrderOwner : null,
    isOrderNumberCorrected: isFound ? verification.isOrderNumberCorrected : null,
    candidateOrderNumbers: verification.status === "nomor_ambigu" ? verification.candidateOrderNumbers : null,
  };
}

function toBersumber<T>(value: T | null, source: string | null): Bersumber<T> | null {
  return value === null || source === null ? null : { value, source };
}
