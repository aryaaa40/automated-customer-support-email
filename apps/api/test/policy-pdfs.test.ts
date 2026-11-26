import { PolicyManifestSchema, PRODUCT_CATEGORIES, type PolicyVersionStatus } from "@email-routing/shared";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config";
import type { PolicyVersion } from "../src/policies/parse-policy-source";
import { buildPolicyPdfs, POLICY_MANIFEST_FILE, type BuiltPolicyPdf } from "../src/policies/policy-pdfs";

/**
 * Korpus PDF Kebijakan (#7): sumber Markdown di data/policies/source → PDF.
 * Test membaca PDF lewat ekstraksi teks, persis seperti Policy Ingestion (#14) nanti.
 */

const ACTIVE_TITLES = [
  "Kebijakan Refund & Pengembalian",
  "Kebijakan Pengiriman & Klaim Paket Hilang",
  "Kebijakan Garansi Produk",
  "Kebijakan Pembayaran & Verifikasi Transfer",
  "Kebijakan Akun & Keamanan",
  "Panduan Tone & Template Balasan CS",
];

interface ExtractedPolicy {
  built: BuiltPolicyPdf;
  pages: string[];
}

let policies: ExtractedPolicy[];

beforeAll(async () => {
  // unpdf hanya tersedia sebagai ESM; import dinamis supaya bisa dipakai dari test CommonJS.
  const { extractText } = await import("unpdf");
  const builtPdfs = await buildPolicyPdfs(config.policySourceDir());
  policies = await Promise.all(
    builtPdfs.map(async (built) => {
      const { text } = await extractText(new Uint8Array(built.pdf), { mergePages: false });
      return { built, pages: text };
    }),
  );
});

const policyOf = (policy: ExtractedPolicy): PolicyVersion => policy.built.policy;
const findPolicy = (title: string, status: PolicyVersionStatus) => {
  const policy = policies.find((p) => policyOf(p).title === title && policyOf(p).status === status);
  if (!policy) throw new Error(`${title} (${status}) tidak ada`);
  return policy;
};
/** Teks satu pasal di PDF: dari judulnya sampai judul pasal berikutnya. */
const articleText = (policy: ExtractedPolicy, number: string) => {
  const all = normalizeSpace(policy.pages.join(" "));
  const start = all.indexOf(`Pasal ${number} `);
  if (start < 0) throw new Error(`Pasal ${number} tidak ada di teks PDF`);
  const next = all.slice(start + 1).search(/Pasal \d+\.\d+ /);
  return next < 0 ? all.slice(start) : all.slice(start, start + 1 + next);
};
const normalizeSpace = (text: string) => text.replace(/\s+/g, " ");

describe("korpus PDF Kebijakan", () => {
  it("berisi enam Kebijakan aktif dan satu Kebijakan Refund lama yang tidak berlaku", () => {
    const active = policies.filter((p) => policyOf(p).status === "aktif").map((p) => policyOf(p).title);
    const inactive = policies.filter((p) => policyOf(p).status === "tidak_berlaku").map((p) => policyOf(p).title);

    expect(active.sort()).toEqual([...ACTIVE_TITLES].sort());
    expect(inactive).toEqual(["Kebijakan Refund & Pengembalian"]);
  });

  it("setiap PDF 3–8 halaman dengan teks yang bisa diekstrak di setiap halaman", () => {
    for (const policy of policies) {
      const label = policy.built.file;
      expect(policy.pages.length, label).toBeGreaterThanOrEqual(3);
      expect(policy.pages.length, label).toBeLessThanOrEqual(8);
      for (const page of policy.pages) expect(page.trim().length, label).toBeGreaterThan(200);
    }
  });

  it("setiap pasal terbaca sebagai 'Pasal n.k Judul' di halaman yang dicatat manifest", () => {
    for (const policy of policies) {
      const { manifestEntry } = policy.built;
      const sourceArticles = policyOf(policy).chapters.flatMap((chapter) => chapter.articles);
      expect(manifestEntry.articles.map((a) => a.number)).toEqual(sourceArticles.map((a) => a.number));

      for (const article of manifestEntry.articles) {
        const page = normalizeSpace(policy.pages[article.page - 1] ?? "");
        expect(page, `${policy.built.file} Pasal ${article.number}`).toContain(
          `Pasal ${article.number} ${article.title}`,
        );
      }
    }
  });

  it("setiap dokumen punya tabel dan pengecualian", () => {
    for (const policy of policies) {
      const blocks = policyOf(policy).chapters.flatMap((c) => c.articles.flatMap((a) => a.blocks));
      expect(blocks.some((b) => b.kind === "table"), policy.built.file).toBe(true);
      expect(
        blocks.some((b) => b.kind === "note" && b.text.startsWith("Pengecualian")),
        policy.built.file,
      ).toBe(true);
    }
  });

  it("status Versi Kebijakan tercetak di setiap halaman", () => {
    for (const policy of policies) {
      const marker = policyOf(policy).status === "aktif" ? "Status: Aktif" : "TIDAK BERLAKU";
      for (const page of policy.pages) expect(normalizeSpace(page), policy.built.file).toContain(marker);
    }
  });
});

describe("Kebijakan Refund", () => {
  it("versi aktif: batas pengajuan 7 hari di Pasal 3.1", () => {
    const refund = findPolicy("Kebijakan Refund & Pengembalian", "aktif");
    expect(articleText(refund, "3.1")).toContain("7 (tujuh) hari kalender");
    expect(normalizeSpace(refund.pages.join(" "))).not.toContain("14 (empat belas) hari");
  });

  it("versi lama: batas 14 hari, ditandai tidak berlaku dan menyebut penggantinya", () => {
    const oldRefund = findPolicy("Kebijakan Refund & Pengembalian", "tidak_berlaku");
    const active = findPolicy("Kebijakan Refund & Pengembalian", "aktif");

    expect(articleText(oldRefund, "3.1")).toContain("14 (empat belas) hari kalender");
    expect(normalizeSpace(oldRefund.pages[0] ?? "")).toContain(`digantikan oleh Versi ${policyOf(active).version}`);
    expect(Number(policyOf(oldRefund).version)).toBeLessThan(Number(policyOf(active).version));
  });
});

describe("Kebijakan Garansi", () => {
  it("masa garansi berbeda untuk setiap kategori produk di seed", () => {
    const warranty = findPolicy("Kebijakan Garansi Produk", "aktif");
    const table = policyOf(warranty)
      .chapters.flatMap((c) => c.articles.flatMap((a) => a.blocks))
      .find((b) => b.kind === "table" && b.header[0] === "Kategori Produk");
    if (table?.kind !== "table") throw new Error("tabel masa garansi tidak ada");

    const categories = table.rows.map(([label = ""]) => label.toLowerCase().replace(/ /g, "_"));
    expect(categories.sort()).toEqual([...PRODUCT_CATEGORIES].sort());
    const periods = table.rows.map((row) => row[1]);
    expect(new Set(periods).size).toBe(periods.length);

    const text = normalizeSpace(warranty.pages.join(" "));
    for (const [label, period] of table.rows) expect(text).toContain(`${label} ${period}`);
  });
});

describe("pembuatan ulang", () => {
  it("deterministik: sumber yang sama menghasilkan byte PDF yang sama", async () => {
    const again = await buildPolicyPdfs(config.policySourceDir());
    for (const [index, policy] of policies.entries()) {
      expect(again[index]?.pdf.equals(policy.built.pdf), policy.built.file).toBe(true);
    }
  });

  it("PDF dan manifest di repo sama dengan hasil sumbernya (jalankan `pnpm policies:generate` bila gagal)", async () => {
    const outputDir = config.policyPdfDir();
    for (const { built } of policies) {
      const committed = await readFile(path.join(outputDir, built.file));
      expect(committed.equals(built.pdf), built.file).toBe(true);
    }
    const manifest = PolicyManifestSchema.parse(
      JSON.parse(await readFile(path.join(outputDir, POLICY_MANIFEST_FILE), "utf8")),
    );
    expect(manifest).toEqual(policies.map((p) => p.built.manifestEntry));
  });
});
