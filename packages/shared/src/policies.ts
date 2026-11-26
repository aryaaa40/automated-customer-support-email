import { z } from "zod";

/** Status Versi Kebijakan: hanya versi `aktif` yang boleh menjadi acuan (GLOSSARY: Versi Kebijakan). */
export const POLICY_VERSION_STATUSES = ["aktif", "tidak_berlaku"] as const;
export const PolicyVersionStatusSchema = z.enum(POLICY_VERSION_STATUSES);
export type PolicyVersionStatus = z.infer<typeof PolicyVersionStatusSchema>;

/**
 * Satu PDF Kebijakan di `data/policies/manifest.json`: metadata Versi Kebijakan
 * beserta halaman tempat setiap pasal dimulai. Dibuat ulang oleh `pnpm policies:generate`.
 */
export const PolicyManifestEntrySchema = z.object({
  file: z.string(),
  code: z.string(),
  title: z.string(),
  version: z.string(),
  status: PolicyVersionStatusSchema,
  effectiveDate: z.iso.date(),
  pageCount: z.number().int().positive(),
  articles: z.array(
    z.object({
      number: z.string(),
      title: z.string(),
      page: z.number().int().positive(),
    }),
  ),
});
export type PolicyManifestEntry = z.infer<typeof PolicyManifestEntrySchema>;

/** Isi `data/policies/manifest.json`: satu entri per PDF Kebijakan. */
export const PolicyManifestSchema = z.array(PolicyManifestEntrySchema);
