import { PolicyVersionStatusSchema } from "@email-routing/shared";
import { z } from "zod";

/**
 * Sumber PDF Kebijakan ditulis sebagai Markdown terbatas supaya mudah diedit dan
 * di-review di repo. Bentuk yang dikenali:
 *
 *   ---                         metadata Versi Kebijakan (lihat PolicyMetadataSchema)
 *   ## BAB 3 Judul Bab          bab, bernomor urut mulai 1
 *   ### Pasal 3.1 Judul Pasal   pasal, bernomor <bab>.<urut> mulai 1
 *   paragraf                    baris berurutan digabung jadi satu paragraf
 *   - butir                     daftar (dirender a., b., c.)
 *   | a | b |                   tabel; baris kedua pemisah |---|
 *   > catatan                   kotak catatan, misalnya pengecualian
 *
 * Penomoran yang konsisten penting karena Policy Ingestion (#14) memotong teks
 * PDF per pasal berdasarkan pola "Pasal n.k", dan Sitasi merujuk nomor itu.
 */

const PolicyMetadataSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1),
  status: PolicyVersionStatusSchema,
  effectiveDate: z.iso.date(),
  owner: z.string().min(1),
  /** Hanya untuk versi tidak berlaku: versi pengganti dan tanggal terakhir berlaku. */
  supersededBy: z.string().min(1).optional(),
  effectiveUntil: z.iso.date().optional(),
});
/** Metadata Versi Kebijakan dari frontmatter sumber. */
export type PolicyMetadata = z.infer<typeof PolicyMetadataSchema>;

/** Satu blok isi pasal: paragraf, daftar butir, tabel, atau kotak catatan (misalnya pengecualian). */
export type PolicyBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "note"; text: string };

/** Pasal: satuan bernomor terkecil Kebijakan, yang dirujuk Sitasi dan Aturan Terhitung. */
export interface PolicyArticle {
  /** Nomor pasal "<bab>.<urut>", misalnya "3.1". */
  number: string;
  title: string;
  blocks: PolicyBlock[];
}

/** Bab: kelompok pasal bernomor urut. */
export interface PolicyChapter {
  number: number;
  title: string;
  articles: PolicyArticle[];
}

/** Satu Versi Kebijakan yang siap dirender menjadi PDF. */
export interface PolicyVersion extends PolicyMetadata {
  chapters: PolicyChapter[];
}

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n/;
const CHAPTER_PATTERN = /^## BAB (\d+) (.+)$/;
const ARTICLE_PATTERN = /^### Pasal (\d+)\.(\d+) (.+)$/;
const TABLE_SEPARATOR_PATTERN = /^\|(\s*:?-+:?\s*\|)+$/;

/** Mengubah teks sumber Kebijakan menjadi PolicyVersion; melempar error bila struktur atau penomorannya tidak konsisten. */
export function parsePolicySource(source: string): PolicyVersion {
  const normalized = source.replace(/\r\n/g, "\n");
  const frontmatter = FRONTMATTER_PATTERN.exec(normalized);
  if (!frontmatter) throw new Error("Sumber Kebijakan harus diawali frontmatter --- ... ---");
  const [header, frontmatterText = ""] = frontmatter;
  const metadata = PolicyMetadataSchema.parse(parseFrontmatter(frontmatterText));
  const bodyStartLine = header.split("\n").length;
  const bodyLines = normalized.slice(header.length).split("\n");
  return { ...metadata, chapters: parseChapters(bodyLines, bodyStartLine) };
}

function parseFrontmatter(text: string): Record<string, string> {
  const entries = text.split("\n").map((line) => {
    const separator = line.indexOf(":");
    if (separator < 0) throw new Error(`Baris frontmatter tanpa ":": ${line}`);
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  });
  return Object.fromEntries(entries);
}

function parseChapters(lines: string[], firstLineNumber: number): PolicyChapter[] {
  const chapters: PolicyChapter[] = [];
  let index = 0;
  const fail = (message: string): never => {
    throw new Error(`Baris ${firstLineNumber + index}: ${message}`);
  };

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      index++;
      continue;
    }

    const chapterMatch = CHAPTER_PATTERN.exec(line);
    if (chapterMatch) {
      const [, chapterNumber = "", title = ""] = chapterMatch;
      const number = Number(chapterNumber);
      const expected = chapters.length + 1;
      if (number !== expected) fail(`BAB ${number} seharusnya BAB ${expected}`);
      chapters.push({ number, title: title.trim(), articles: [] });
      index++;
      continue;
    }

    const chapter = chapters.at(-1) ?? fail(`isi sebelum BAB pertama: ${line}`);

    const articleMatch = ARTICLE_PATTERN.exec(line);
    if (articleMatch) {
      const [, chapterNumber, articleIndex, title = ""] = articleMatch;
      const number = `${chapterNumber}.${articleIndex}`;
      const expected = `${chapter.number}.${chapter.articles.length + 1}`;
      if (number !== expected) fail(`Pasal ${number} seharusnya Pasal ${expected}`);
      chapter.articles.push({ number, title: title.trim(), blocks: [] });
      index++;
      continue;
    }

    const article = chapter.articles.at(-1) ?? fail(`isi BAB ${chapter.number} sebelum pasal pertamanya: ${line}`);
    const blockLines = takeBlockLines(lines, index);
    article.blocks.push(parseBlock(blockLines, fail));
    index += blockLines.length;
  }

  for (const chapter of chapters) {
    if (chapter.articles.length === 0) throw new Error(`BAB ${chapter.number} tidak punya pasal`);
    for (const article of chapter.articles) {
      if (article.blocks.length === 0) throw new Error(`Pasal ${article.number} kosong`);
    }
  }
  return chapters;
}

/** Baris-baris satu blok: berhenti di baris kosong atau judul berikutnya. */
function takeBlockLines(lines: string[], start: number): string[] {
  const block: string[] = [];
  for (const line of lines.slice(start)) {
    if (line.trim() === "" || line.startsWith("## ") || line.startsWith("### ")) break;
    block.push(line.trim());
  }
  return block;
}

function parseBlock(lines: string[], fail: (message: string) => never): PolicyBlock {
  const first = lines[0] ?? "";
  if (first.startsWith("- ")) {
    if (!lines.every((line) => line.startsWith("- "))) fail("setiap baris daftar harus diawali \"- \"");
    return { kind: "list", items: lines.map((line) => line.slice(2).trim()) };
  }
  if (first.startsWith("|")) return parseTable(lines, fail);
  if (first.startsWith(">")) {
    if (!lines.every((line) => line.startsWith(">"))) fail("setiap baris catatan harus diawali \">\"");
    return { kind: "note", text: joinLines(lines.map((line) => line.slice(1))) };
  }
  return { kind: "paragraph", text: joinLines(lines) };
}

function parseTable(lines: string[], fail: (message: string) => never): PolicyBlock {
  if (lines.length < 3 || !TABLE_SEPARATOR_PATTERN.test(lines[1] ?? "")) {
    fail("tabel butuh baris judul, baris pemisah |---|, dan minimal satu baris isi");
  }
  const cells = lines.map(splitTableRow);
  const header = cells[0] ?? [];
  const rows = cells.slice(2);
  for (const row of rows) {
    if (row.length !== header.length) fail(`baris tabel punya ${row.length} kolom, judulnya ${header.length}`);
  }
  return { kind: "table", header, rows };
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function joinLines(lines: string[]): string {
  return lines.map((line) => line.trim()).join(" ");
}
