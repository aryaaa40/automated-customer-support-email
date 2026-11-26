import { z } from "zod";
import { KategoriSchema, SentimenSchema, UrgensiSchema } from "./domain";

/**
 * Kontrak Extraction: bentuk JSON yang wajib dikembalikan LLM untuk satu Email Masuk.
 *
 * Aturan kontrak:
 * - Setiap data membawa sumbernya: `body` atau `lampiran:<nama file>`.
 * - Data yang tidak ada bernilai `null`, bukan tebakan.
 * - Semua field wajib ada (nullable, bukan optional) supaya cocok dengan
 *   structured output mode strict di OpenAI.
 *
 * Prompt dan penyempurnaan skema ini milik pemilik repo (#12).
 */

/** Sumber sebuah data: body email atau satu Lampiran tertentu. */
export const SumberSchema = z
  .string()
  .regex(/^(body|lampiran:.+)$/, "sumber harus 'body' atau 'lampiran:<nama file>'");
export type Sumber = z.infer<typeof SumberSchema>;

/** Satu data terekstrak beserta sumbernya; seluruhnya `null` kalau data tidak ada. */
const bersumber = <T extends z.ZodType>(value: T) =>
  z.object({ value, source: SumberSchema }).nullable();

/** Satu data terekstrak beserta sumbernya. */
export interface Bersumber<T> {
  value: T;
  source: Sumber;
}

export const ExtractedIssueSchema = z.object({
  category: KategoriSchema,
  urgency: UrgensiSchema,
  /** Ringkasan netral masalahnya, bukan kutipan email. Dipakai sebagai query retrieval. */
  summary: z.string().min(1),
  orderNumber: bersumber(z.string().min(1)),
  /** Nominal dalam Rupiah (bilangan bulat). */
  amount: bersumber(z.number().int().nonnegative()),
  /** Tanggal yang relevan dengan Issue, format YYYY-MM-DD. */
  date: bersumber(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  productName: bersumber(z.string().min(1)),
});
export type ExtractedIssue = z.infer<typeof ExtractedIssueSchema>;

/** Penanda boolean beserta kutipan kalimat bukti (null kalau tidak ada). */
const penanda = z.object({ present: z.boolean(), evidence: z.string().nullable() });
export type Penanda = z.infer<typeof penanda>;

export const ExtractionSchema = z.object({
  issues: z.array(ExtractedIssueSchema).min(1),
  sentiment: SentimenSchema,
  /** Ancaman: polisi, viral, YLKI, jalur hukum. Terpisah dari Sentimen. */
  threat: penanda,
  /** Upaya Injection di body atau Lampiran. */
  injectionAttempt: penanda,
  ambiguous: z.object({ isAmbiguous: z.boolean(), reason: z.string().nullable() }),
});
export type Extraction = z.infer<typeof ExtractionSchema>;
export type Ambigu = Extraction["ambiguous"];
