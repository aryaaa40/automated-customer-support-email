import type { ExtractedIssue, Extraction } from "@email-routing/shared";

/** Extraction valid minimal; test menimpa bagian yang relevan. */
export function extraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    issues: [issue()],
    sentiment: "netral",
    threat: { present: false, evidence: null },
    injectionAttempt: { present: false, evidence: null },
    ambiguous: { isAmbiguous: false, reason: null },
    ...overrides,
  };
}

export function issue(overrides: Partial<ExtractedIssue> = {}): ExtractedIssue {
  return {
    category: "pertanyaan_produk",
    urgency: "rendah",
    summary: "Pelanggan bertanya tentang produk",
    orderNumber: null,
    amount: null,
    date: null,
    productName: null,
    ...overrides,
  };
}
