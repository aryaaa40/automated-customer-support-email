import type { PolicyManifestEntry } from "@email-routing/shared";
import { readdir, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parsePolicySource, type PolicyVersion } from "./parse-policy-source";
import { renderPolicyPdf } from "./render-policy-pdf";

/** PDF Kebijakan yang sudah dirender di memori, belum ditulis ke disk. */
export interface BuiltPolicyPdf {
  /** Nama file PDF, sama dengan nama file sumbernya: `refund-v3.0.md` → `refund-v3.0.pdf`. */
  file: string;
  policy: PolicyVersion;
  pdf: Buffer;
  manifestEntry: PolicyManifestEntry;
}

/** Nama file manifest di folder PDF Kebijakan. */
export const POLICY_MANIFEST_FILE = "manifest.json";

/** Membaca semua sumber `*.md` di `sourceDir` (urut nama file) dan merendernya menjadi PDF. */
export async function buildPolicyPdfs(sourceDir: string): Promise<BuiltPolicyPdf[]> {
  const sourceFiles = (await readdir(sourceDir)).filter((name) => name.endsWith(".md")).sort();
  return Promise.all(
    sourceFiles.map(async (sourceFile) => {
      const policy = parseSourceFile(sourceFile, await readFile(path.join(sourceDir, sourceFile), "utf8"));
      const rendered = await renderPolicyPdf(policy);
      const file = sourceFile.replace(/\.md$/, ".pdf");
      const manifestEntry: PolicyManifestEntry = {
        file,
        code: policy.code,
        title: policy.title,
        version: policy.version,
        status: policy.status,
        effectiveDate: policy.effectiveDate,
        pageCount: rendered.pageCount,
        articles: policy.chapters.flatMap((chapter) =>
          chapter.articles.map((article) => ({
            number: article.number,
            title: article.title,
            page: getArticlePage(rendered.articlePages, sourceFile, article.number),
          })),
        ),
      };
      return { file, policy, pdf: rendered.pdf, manifestEntry };
    }),
  );
}

/**
 * Membuat ulang semua PDF Kebijakan dan `manifest.json` di `outputDir`, lalu
 * menghapus PDF lama yang sumbernya sudah tidak ada.
 */
export async function generatePolicyPdfs(sourceDir: string, outputDir: string): Promise<PolicyManifestEntry[]> {
  const builtPdfs = await buildPolicyPdfs(sourceDir);
  await mkdir(outputDir, { recursive: true });
  for (const built of builtPdfs) await writeFile(path.join(outputDir, built.file), built.pdf);

  const generatedFiles = new Set(builtPdfs.map((built) => built.file));
  for (const name of await readdir(outputDir)) {
    if (name.endsWith(".pdf") && !generatedFiles.has(name)) await rm(path.join(outputDir, name));
  }

  const manifest = builtPdfs.map((built) => built.manifestEntry);
  await writeFile(path.join(outputDir, POLICY_MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function getArticlePage(articlePages: Map<string, number>, sourceFile: string, articleNumber: string): number {
  const page = articlePages.get(articleNumber);
  if (page === undefined) throw new Error(`${sourceFile}: halaman Pasal ${articleNumber} tidak tercatat saat render`);
  return page;
}

function parseSourceFile(sourceFile: string, source: string): PolicyVersion {
  try {
    return parsePolicySource(source);
  } catch (error) {
    throw new Error(`${sourceFile}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}
