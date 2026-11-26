import PDFDocument from "pdfkit";
import type { PolicyArticle, PolicyBlock, PolicyChapter, PolicyVersion } from "./parse-policy-source";

/**
 * Merender satu Versi Kebijakan menjadi PDF A4 berteks (font standar Helvetica,
 * bukan gambar), dengan kop berisi kode, versi, dan status di setiap halaman.
 * Hasilnya deterministik: tanggal PDF diambil dari tanggal berlaku, bukan jam sistem,
 * jadi sumber yang sama selalu menghasilkan byte yang sama.
 */

/** PDF hasil render satu Versi Kebijakan beserta posisi halaman setiap pasal. */
export interface RenderedPolicyPdf {
  pdf: Buffer;
  pageCount: number;
  /** Halaman (mulai 1) tempat judul setiap pasal tercetak, per nomor pasal. */
  articlePages: Map<string, number>;
}

const MARGIN = { top: 78, bottom: 70, left: 64, right: 64 };
const HEADER_Y = 36;
/** Jarak garis bawah kop dari baris teks kop. */
const HEADER_RULE_OFFSET = 14;
const FOOTER_OFFSET = 44;
/** Lebar kolom label di tabel metadata halaman pertama. */
const METADATA_LABEL_WIDTH = 130;
const BOX_PADDING = 8;

const FONT = { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
const COLOR = {
  text: "#222222",
  muted: "#666666",
  accent: "#1F3A5F",
  rule: "#BBBBBB",
  tableHeader: "#E8EDF3",
  noteBackground: "#F4F4F4",
  inactive: "#B00020",
  inactiveBackground: "#FCE8EA",
};
const SIZE = { title: 20, chapter: 12.5, article: 11, body: 10.5, small: 8.5 };
const TABLE_FONT_SIZE = SIZE.body - 0.5;
const LINE_GAP = 2.5;
const LIST_INDENT = 18;
/** Batas bobot lebar kolom tabel (dalam jumlah karakter). */
const MIN_COLUMN_WEIGHT = 12;
const MAX_COLUMN_WEIGHT = 60;

/** Ruang minimal di bawah judul supaya judul tidak tertinggal sendirian di dasar halaman. */
const MIN_SPACE_AFTER_CHAPTER = 140;
const MIN_SPACE_AFTER_ARTICLE = 70;
/** Tabel tidak dimulai di dasar halaman kalau ruangnya kurang dari ini. */
const MIN_SPACE_BEFORE_TABLE = 80;

const TABLE_CELL_STYLE: PDFKit.Mixins.CellStyle = { border: 0.5, borderColor: COLOR.rule, padding: [4, 6], textColor: COLOR.text };

/** Cara setiap status Versi Kebijakan ditampilkan; versi tidak berlaku ditandai merah di setiap halaman. */
const STATUS_DISPLAY = {
  aktif: { label: "Aktif", headerLabel: "Status: Aktif", color: COLOR.accent },
  tidak_berlaku: { label: "Tidak Berlaku", headerLabel: "TIDAK BERLAKU", color: COLOR.inactive },
} as const;

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Merender PolicyVersion menjadi PDF beserta halaman tiap pasal. */
export function renderPolicyPdf(policy: PolicyVersion): Promise<RenderedPolicyPdf> {
  const fixedDate = new Date(`${policy.effectiveDate}T00:00:00Z`);
  const doc = new PDFDocument({
    size: "A4",
    margins: MARGIN,
    bufferPages: true,
    info: {
      Title: `${policy.title} (Versi ${policy.version})`,
      Author: policy.owner,
      Subject: `${policy.code} versi ${policy.version}, status ${policy.status}`,
      Keywords: [policy.code, `versi ${policy.version}`, policy.status].join(", "),
      Creator: "email-routing policies:generate",
      CreationDate: fixedDate,
      ModDate: fixedDate,
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const articlePages = new Map<string, number>();
  const currentPage = () => doc.bufferedPageRange().count;

  renderTitleBlock(doc, policy);
  for (const chapter of policy.chapters) {
    renderChapter(doc, chapter, (article) => articlePages.set(article.number, currentPage()));
  }
  const pageCount = currentPage();
  renderPageFrames(doc, policy, pageCount);
  doc.end();

  return finished.then((pdf) => ({ pdf, pageCount, articlePages }));
}

function renderTitleBlock(doc: PDFKit.PDFDocument, policy: PolicyVersion) {
  const width = contentWidth(doc);
  doc.font(FONT.bold).fontSize(SIZE.small).fillColor(COLOR.muted).text(policy.owner.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveDown(0.3);
  doc.font(FONT.bold).fontSize(SIZE.title).fillColor(COLOR.accent).text(policy.title);
  doc.moveDown(0.6);

  const rows: [string, string][] = [
    ["Nomor Dokumen", policy.code],
    ["Versi", policy.version],
    ["Status", STATUS_DISPLAY[policy.status].label],
    ["Berlaku sejak", formatDate(policy.effectiveDate)],
  ];
  if (policy.effectiveUntil) rows.push(["Berlaku sampai", formatDate(policy.effectiveUntil)]);
  rows.push(["Pemilik Dokumen", policy.owner]);

  doc.table({
    columnStyles: [METADATA_LABEL_WIDTH, width - METADATA_LABEL_WIDTH],
    defaultStyle: TABLE_CELL_STYLE,
    data: rows.map(([label, value]) => [
      { text: label, font: { src: FONT.bold, size: SIZE.body }, backgroundColor: COLOR.tableHeader },
      { text: value, font: { src: FONT.regular, size: SIZE.body } },
    ]),
  });
  doc.x = doc.page.margins.left;
  doc.moveDown(0.6);

  if (policy.status === "tidak_berlaku") {
    const replacement = policy.supersededBy ? `digantikan oleh Versi ${policy.supersededBy}` : "dicabut";
    const until = policy.effectiveUntil ? ` setelah ${formatDate(policy.effectiveUntil)}` : "";
    renderBox(
      doc,
      `TIDAK BERLAKU. Dokumen ini telah ${replacement}${until} dan disimpan hanya sebagai arsip. ` +
        "Jangan dijadikan acuan untuk menangani pelanggan.",
      { background: COLOR.inactiveBackground, color: COLOR.inactive, font: FONT.bold },
    );
  }
}

function renderChapter(
  doc: PDFKit.PDFDocument,
  chapter: PolicyChapter,
  onArticleStart: (article: PolicyArticle) => void,
) {
  ensureSpace(doc, MIN_SPACE_AFTER_CHAPTER);
  doc.moveDown(0.6);
  doc
    .font(FONT.bold)
    .fontSize(SIZE.chapter)
    .fillColor(COLOR.accent)
    .text(`BAB ${chapter.number} ${chapter.title.toUpperCase()}`);
  const ruleY = doc.y + 2;
  doc
    .moveTo(doc.page.margins.left, ruleY)
    .lineTo(doc.page.width - doc.page.margins.right, ruleY)
    .lineWidth(0.6)
    .strokeColor(COLOR.accent)
    .stroke();
  doc.y = ruleY + 8;

  for (const article of chapter.articles) {
    ensureSpace(doc, MIN_SPACE_AFTER_ARTICLE);
    doc.moveDown(0.4);
    onArticleStart(article);
    doc
      .font(FONT.bold)
      .fontSize(SIZE.article)
      .fillColor(COLOR.text)
      .text(`Pasal ${article.number} ${article.title}`);
    doc.moveDown(0.3);
    for (const block of article.blocks) renderBlock(doc, block);
  }
}

function renderBlock(doc: PDFKit.PDFDocument, block: PolicyBlock) {
  switch (block.kind) {
    case "paragraph":
      bodyText(doc).text(block.text, { lineGap: LINE_GAP });
      doc.moveDown(0.5);
      return;
    case "list":
      renderList(doc, block.items);
      return;
    case "table":
      renderTable(doc, block.header, block.rows);
      return;
    case "note":
      renderBox(doc, block.text, { background: COLOR.noteBackground, color: COLOR.text, font: FONT.italic });
      doc.moveDown(0.5);
      return;
  }
}

function renderList(doc: PDFKit.PDFDocument, items: string[]) {
  const left = doc.page.margins.left;
  const textWidth = contentWidth(doc) - LIST_INDENT;
  items.forEach((item, index) => {
    bodyText(doc);
    ensureSpace(doc, doc.heightOfString(item, { width: textWidth, lineGap: LINE_GAP }));
    const y = doc.y;
    doc.text(`${listLabel(index)}.`, left, y, { lineBreak: false });
    doc.text(item, left + LIST_INDENT, y, { width: textWidth, lineGap: LINE_GAP });
    doc.moveDown(0.2);
  });
  doc.x = left;
  doc.moveDown(0.4);
}

function renderTable(doc: PDFKit.PDFDocument, header: string[], rows: string[][]) {
  ensureSpace(doc, MIN_SPACE_BEFORE_TABLE);
  doc.table({
    columnStyles: columnWidths(contentWidth(doc), [header, ...rows]),
    defaultStyle: TABLE_CELL_STYLE,
    data: [
      header.map((text) => ({
        text,
        type: "TH" as const,
        font: { src: FONT.bold, size: TABLE_FONT_SIZE },
        backgroundColor: COLOR.tableHeader,
      })),
      ...rows.map((row) => row.map((text) => ({ text, font: { src: FONT.regular, size: TABLE_FONT_SIZE } }))),
    ],
  });
  doc.x = doc.page.margins.left;
  doc.moveDown(0.7);
}

/** Lebar kolom sebanding dengan teks terpanjangnya, supaya kolom label tidak selebar kolom penjelasan. */
function columnWidths(totalWidth: number, rows: string[][]): number[] {
  const columnCount = rows[0]?.length ?? 0;
  const weights = Array.from({ length: columnCount }, (_, column) =>
    Math.min(MAX_COLUMN_WEIGHT, Math.max(MIN_COLUMN_WEIGHT, ...rows.map((row) => row[column]?.length ?? 0))),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (totalWidth * weight) / totalWeight);
}

function renderBox(
  doc: PDFKit.PDFDocument,
  text: string,
  style: { background: string; color: string; font: string },
) {
  const padding = BOX_PADDING;
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  doc.font(style.font).fontSize(SIZE.body);
  const height = doc.heightOfString(text, { width: width - 2 * padding, lineGap: LINE_GAP }) + 2 * padding;
  ensureSpace(doc, height);
  const top = doc.y;
  doc.rect(left, top, width, height).fill(style.background);
  doc.rect(left, top, 3, height).fill(style.color);
  doc
    .fillColor(style.color)
    .text(text, left + padding, top + padding, { width: width - 2 * padding, lineGap: LINE_GAP });
  doc.x = left;
  doc.y = top + height;
}

/** Kop dan kaki di setiap halaman; ditulis setelah isi karena butuh jumlah halaman total. */
function renderPageFrames(doc: PDFKit.PDFDocument, policy: PolicyVersion, pageCount: number) {
  for (let index = 0; index < pageCount; index++) {
    doc.switchToPage(index);
    // Menulis di area margin akan memicu halaman baru kalau margin bawah tidak dinolkan dulu.
    const { bottom } = doc.page.margins;
    doc.page.margins.bottom = 0;
    const left = doc.page.margins.left;
    const width = contentWidth(doc);

    doc
      .font(FONT.regular)
      .fontSize(SIZE.small)
      .fillColor(COLOR.muted)
      .text(`${policy.code} · ${policy.title}`, left, HEADER_Y, { width, lineBreak: false });
    const status = STATUS_DISPLAY[policy.status];
    doc
      .font(FONT.bold)
      .fillColor(status.color)
      .text(`Versi ${policy.version} · ${status.headerLabel}`, left, HEADER_Y, {
        width,
        align: "right",
        lineBreak: false,
      });
    doc
      .moveTo(left, HEADER_Y + HEADER_RULE_OFFSET)
      .lineTo(left + width, HEADER_Y + HEADER_RULE_OFFSET)
      .lineWidth(0.5)
      .strokeColor(COLOR.rule)
      .stroke();

    const footerY = doc.page.height - FOOTER_OFFSET;
    doc
      .font(FONT.regular)
      .fontSize(SIZE.small)
      .fillColor(COLOR.muted)
      .text(`Dokumen internal. Berlaku sejak ${formatDate(policy.effectiveDate)}.`, left, footerY, {
        width,
        lineBreak: false,
      })
      .text(`Halaman ${index + 1} dari ${pageCount}`, left, footerY, { width, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottom;
  }
}

function bodyText(doc: PDFKit.PDFDocument) {
  return doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLOR.text);
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

/** a, b, c, ... sesuai gaya penomoran butir di dokumen hukum Indonesia. */
function listLabel(index: number) {
  return String.fromCharCode("a".charCodeAt(0) + index);
}

/** "2026-08-01" → "1 Agustus 2026" (tanpa Intl supaya hasilnya tidak bergantung locale mesin). */
function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}
