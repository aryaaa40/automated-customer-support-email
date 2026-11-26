import type { IncomingEmail } from "../email-source/email-source";

/**
 * Masking data sensitif sebelum teks Email Masuk menjadi prompt LLM (spec #1,
 * user story 47). Nomor kartu, rekening, HP, dan alamat diganti token
 * bernomor seperti `[KARTU_1]`, supaya model tetap tahu ada data apa di situ
 * tanpa melihat nilainya. Lampiran dikirim utuh; itu batasan yang disengaja.
 *
 * Urutan kerjanya:
 * 1. Nomor order dan nominal dilindungi dulu, karena keduanya dibutuhkan Extraction.
 * 2. Alamat dicari lewat kata kunci (`Jl.`, `Gg.`, `RT`, `Alamat:`, ...).
 * 3. Sisa deretan angka ≥ 10 digit diklasifikasikan menjadi HP, kartu, atau rekening.
 * Bagian yang sudah dilindungi atau ditemukan diganti karakter pelindung
 * sepanjang aslinya, sehingga langkah berikutnya tidak bisa menyentuhnya dan
 * posisi karakter tetap sama dengan teks asli.
 */

export type SensitiveDataType = "KARTU" | "REKENING" | "HP" | "ALAMAT";

interface Span {
  start: number;
  end: number;
}

interface SensitiveSpan extends Span {
  type: SensitiveDataType;
}

/** Pengganti karakter yang sudah dilindungi atau ditemukan; memutus deretan angka dan kata. */
const SHIELD_CHAR = "\u0000";

/** Deretan angka sependek ini (nominal tanpa "Rp", kode pos, tanggal) dibiarkan. */
const MIN_SENSITIVE_DIGITS = 10;

const ORDER_NUMBER_PATTERN = /(?<![\p{L}\p{N}])ORD[\s\-–—_]*[0-9OIL]+(?![\p{L}\p{N}])/giu;
const AMOUNT_PATTERNS = [
  /(?<![\p{L}\p{N}])(?:Rp|IDR)\.?\s?\d[\d.,]*/giu,
  /(?<![\p{L}\p{N}])\d[\d.,]*\s?(?:rupiah|ribu|rb|juta|jt)(?![\p{L}\p{N}])/giu,
];

/**
 * Deretan angka, boleh dipisah satu spasi, titik, atau strip
 * (`0812-3456-7890`, `0812.3456.7890`), boleh diawali `+`. Nominal bertitik
 * seperti `1.250.000` tetap aman karena di bawah ambang 10 digit.
 */
const DIGIT_RUN_PATTERN = /(?<![\p{L}\p{N}+])\+?\d(?:[ .-]?\d)*(?![\p{L}\p{N}])/gu;
/** HP Indonesia: 08… atau 628… (sesudah `+` dan pemisah dibuang), 10–14 digit. */
const PHONE_DIGITS = /^(?:0|62)8\d{8,11}$/;
/** Awalan jaringan kartu: 2/5 Mastercard, 3 Amex/JCB, 4 Visa, 6 Discover/UnionPay. */
const CARD_DIGITS = /^[2-6]\d{14,18}$/;

/**
 * Kata kunci awal alamat. Singkatan jalan dikenali tanpa melihat huruf besar
 * dan langsung menerima satu kata sesudahnya (`jl melati`). Kata lengkap
 * seperti `Jalan` dan `Gang` harus berhuruf besar, karena "belum jalan" juga
 * kalimat biasa.
 */
const STREET_ANCHORS = [
  /(?<![\p{L}\p{N}])(?:jl|jln|komp|perum)(?![\p{L}\p{N}])\.?/giu,
  // "gg" huruf kecil tanpa titik juga slang chat, jadi hanya `gg.` atau `Gg`.
  /(?<![\p{L}\p{N}])(?:gg\.|Gg(?![\p{L}\p{N}])\.?)/gu,
  /(?<![\p{L}\p{N}])(?:Jalan|Gang|Komplek|Kompleks|Perumahan|Dusun)(?![\p{L}\p{N}])/gu,
];
/** Kata kunci wilayah: kata sesudahnya harus tetap terlihat seperti bagian alamat. */
const REGION_ANCHOR =
  /(?<![\p{L}\p{N}])(?:RT|RW|Kel|Kelurahan|Kec|Kecamatan|Kab|Kabupaten|Desa|Kota)(?![\p{L}\p{N}])\.?/gu;
/**
 * Label "Alamat:" menandai alamat apa pun hurufnya: sisa kalimat di baris
 * yang sama, atau kalau label ada di akhir baris, baris berikutnya (plus
 * baris lanjutan yang terlihat seperti alamat).
 */
const ADDRESS_LABEL =
  /(?<![\p{L}\p{N}])alamat(?:\s+(?:pengiriman|rumah|saya|lengkap|kirim|baru|tujuan))*\s*:[ \t]*/giu;

/** Kata huruf kecil yang lazim muncul di tengah alamat. */
const ADDRESS_WORDS = new Set([
  "no", "nomor", "rt", "rw", "blok", "blk", "kel", "kelurahan", "kec", "kecamatan",
  "kab", "kabupaten", "kota", "kode", "pos", "prov", "provinsi", "desa", "ds", "dusun",
  "dsn", "kp", "kampung", "gg", "gang", "jl", "jln", "jalan", "raya", "lt", "lantai",
  "unit", "kav", "kavling", "perum", "perumahan", "komp", "komplek", "kompleks",
  "utara", "selatan", "timur", "barat", "tengah",
]);
/** Singkatan yang boleh diikuti titik tanpa mengakhiri alamat (`No. 5`, `Kel. Sukamaju`). */
const ABBREVIATIONS = new Set([
  "jl", "jln", "no", "gg", "kel", "kec", "kab", "prov", "komp", "perum", "blk", "ds",
  "dsn", "kp", "rt", "rw", "lt", "kav",
]);

/** Satu kata (boleh bersambung `/` atau `-`, mis. `02/RW`) atau satu tanda baca alamat. */
const ADDRESS_TOKEN = /[ \t]*(?:([\p{L}\p{N}]+(?:[/-][\p{L}\p{N}]+)*)|([.,:#()/-]))/uy;
/** Celah di antara dua potongan alamat yang masih dianggap satu alamat (baris berikutnya, koma). */
const ADDRESS_GAP = /^[\s,]*$/;
/** Label "Alamat:" yang langsung diikuti baris baru. */
const LINE_BREAK_AFTER_LABEL = /\r?\n/y;
/** Kata dalam satu baris, sama seperti kata di ADDRESS_TOKEN. */
const ADDRESS_LINE_WORD = /[\p{L}\p{N}]+(?:[/-][\p{L}\p{N}]+)*/gu;
/** Potongan baris di antara bagian yang dilindungi (mis. nomor order di tengah blok alamat). */
const UNSHIELDED_SEGMENT = /[^\u0000]+/g;

type AddressScanMode = "street" | "region" | "labeled";

/**
 * Menyamarkan nomor kartu, rekening, HP, dan alamat di beberapa teks dari
 * email yang sama. Semua teks berbagi satu tabel token, jadi nilai yang sama
 * (walau ditulis berbeda, mis. `0812-3456-7890` dan `+62 812 3456 7890`)
 * selalu mendapat token yang sama. Nomor order dan nominal tidak disamarkan.
 */
export function maskSensitiveData(texts: readonly string[]): string[] {
  const tokens = new TokenTable();
  return texts.map((text) => maskText(text, tokens));
}

/** Email Masuk yang subjek dan body-nya sudah disamarkan, siap menjadi prompt. */
export function maskIncomingEmail(email: IncomingEmail): IncomingEmail {
  const [subject, body] = maskSensitiveData([email.subject, email.body]);
  return { ...email, subject: subject!, body: body! };
}

function maskText(text: string, tokens: TokenTable): string {
  let shielded = shieldSpans(text, findProtectedSpans(text));

  const addressSpans = findAddressSpans(shielded);
  shielded = shieldSpans(shielded, addressSpans);
  const numberSpans = findSensitiveNumberSpans(shielded);

  const sensitiveSpans = [...addressSpans, ...numberSpans].sort((a, b) => a.start - b.start);
  let masked = "";
  let cursor = 0;
  for (const span of sensitiveSpans) {
    const value = text.slice(span.start, span.end);
    masked += text.slice(cursor, span.start) + tokens.tokenFor(span.type, value);
    cursor = span.end;
  }
  return masked + text.slice(cursor);
}

function findProtectedSpans(text: string): Span[] {
  return [ORDER_NUMBER_PATTERN, ...AMOUNT_PATTERNS].flatMap((pattern) => findMatches(text, pattern));
}

function findSensitiveNumberSpans(text: string): SensitiveSpan[] {
  return findMatches(text, DIGIT_RUN_PATTERN).flatMap((span) => {
    const type = classifyDigits(text.slice(span.start, span.end).replace(/\D/g, ""));
    return type ? [{ ...span, type }] : [];
  });
}

function classifyDigits(digits: string): SensitiveDataType | null {
  if (digits.length < MIN_SENSITIVE_DIGITS) return null;
  if (PHONE_DIGITS.test(digits)) return "HP";
  if (CARD_DIGITS.test(digits) && isLuhnValid(digits)) return "KARTU";
  // Deretan panjang lain (rekening, virtual account, NIK) tetap disamarkan.
  return "REKENING";
}

/** Checksum Luhn yang dipakai semua nomor kartu pembayaran. */
function isLuhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function findAddressSpans(text: string): SensitiveSpan[] {
  const anchors: { pattern: RegExp; mode: AddressScanMode }[] = [
    ...STREET_ANCHORS.map((pattern) => ({ pattern, mode: "street" as const })),
    { pattern: REGION_ANCHOR, mode: "region" },
    { pattern: ADDRESS_LABEL, mode: "labeled" },
  ];
  const spans = anchors.flatMap(({ pattern, mode }) =>
    findMatches(text, pattern).flatMap((anchor) => {
      if (mode === "labeled" && isFollowedByLineBreak(text, anchor.end)) {
        return findAddressBlock(text, anchor.end);
      }
      // Label "Alamat:" sendiri tetap terlihat; yang disamarkan isinya.
      const start = mode === "labeled" ? anchor.end : anchor.start;
      const end = findAddressEnd(text, anchor.end, mode);
      return end > anchor.end ? [{ start, end }] : [];
    }),
  );
  return mergeAddressSpans(text, spans).map((span) => ({ ...span, type: "ALAMAT" as const }));
}

/**
 * Posisi akhir alamat yang dimulai di `start`. Kata diterima selama terlihat
 * seperti bagian alamat (huruf besar, mengandung angka, atau kata alamat);
 * berhenti di akhir baris, akhir kalimat, atau bagian yang dilindungi.
 * Mengembalikan `start` kalau tidak ada kata yang diterima.
 */
function findAddressEnd(text: string, start: number, mode: AddressScanMode): number {
  let end = start;
  let position = start;
  let previousWord: string | null = null;
  let acceptsAnyWord = mode !== "region";

  while (position < text.length) {
    ADDRESS_TOKEN.lastIndex = position;
    const match = ADDRESS_TOKEN.exec(text);
    if (!match) break;
    const [token, word, punctuation] = match;

    if (word) {
      if (!acceptsAnyWord && !isAddressWord(word)) break;
      end = position + token.length;
      previousWord = word;
      if (mode === "street") acceptsAnyWord = false;
    } else if (punctuation === "." && !(previousWord && ABBREVIATIONS.has(previousWord.toLowerCase()))) {
      // Titik sesudah kata biasa mengakhiri kalimat, jadi alamatnya selesai.
      break;
    }
    position += token.length;
  }
  return end;
}

function isFollowedByLineBreak(text: string, position: number): boolean {
  LINE_BREAK_AFTER_LABEL.lastIndex = position;
  return LINE_BREAK_AFTER_LABEL.test(text);
}

/**
 * Baris sesudah label "Alamat:" di akhir baris. Baris pertama selalu
 * disamarkan tanpa butuh kata kunci jalan, karena labelnya sudah menandai
 * isinya sebagai alamat. Baris berikutnya ikut hanya kalau semua katanya
 * terlihat seperti alamat, supaya kalimat keluhan di bawahnya (dan Ancaman di
 * dalamnya) tetap sampai ke LLM. Bagian yang dilindungi tidak ikut disamarkan.
 */
function findAddressBlock(text: string, labelEnd: number): Span[] {
  const spans: Span[] = [];
  let lineStart = text.indexOf("\n", labelEnd) + 1;
  let isFirstLine = true;
  while (lineStart < text.length) {
    const newline = text.indexOf("\n", lineStart);
    const lineEnd = newline === -1 ? text.length : newline;
    const line = text.slice(lineStart, lineEnd);
    if (line.trim() === "" || (!isFirstLine && !isAddressLine(line))) break;

    for (const segment of line.matchAll(UNSHIELDED_SEGMENT)) {
      const content = segment[0].trim();
      if (!/[\p{L}\p{N}]/u.test(content)) continue;
      const start = lineStart + segment.index + segment[0].indexOf(content);
      spans.push({ start, end: start + content.length });
    }
    isFirstLine = false;
    lineStart = lineEnd + 1;
  }
  return spans;
}

/** Baris lanjutan alamat: punya kata, dan semua katanya lolos `isAddressWord`. */
function isAddressLine(line: string): boolean {
  const words = line.match(ADDRESS_LINE_WORD) ?? [];
  return words.length > 0 && words.every(isAddressWord);
}

function isAddressWord(word: string): boolean {
  return /^\p{Lu}/u.test(word) || /\d/.test(word) || ADDRESS_WORDS.has(word.toLowerCase());
}

/** Potongan alamat yang tumpang tindih atau hanya dipisah baris baru/koma menjadi satu alamat. */
function mergeAddressSpans(text: string, spans: Span[]): Span[] {
  const merged: Span[] = [];
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && (span.start <= last.end || ADDRESS_GAP.test(text.slice(last.end, span.start)))) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

function findMatches(text: string, pattern: RegExp): Span[] {
  return [...text.matchAll(pattern)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function shieldSpans(text: string, spans: Span[]): string {
  let shielded = text;
  for (const { start, end } of spans) {
    shielded = shielded.slice(0, start) + SHIELD_CHAR.repeat(end - start) + shielded.slice(end);
  }
  return shielded;
}

/** Tabel token untuk satu email: nilai yang sama (setelah dinormalisasi) → token yang sama. */
class TokenTable {
  private readonly tokensByValue = new Map<string, string>();
  private readonly countsByType = new Map<SensitiveDataType, number>();

  tokenFor(type: SensitiveDataType, value: string): string {
    const key = `${type}:${normalizeValue(type, value)}`;
    const existing = this.tokensByValue.get(key);
    if (existing) return existing;

    const count = (this.countsByType.get(type) ?? 0) + 1;
    this.countsByType.set(type, count);
    const token = `[${type}_${count}]`;
    this.tokensByValue.set(key, token);
    return token;
  }
}

function normalizeValue(type: SensitiveDataType, value: string): string {
  if (type === "ALAMAT") return value.toLowerCase().replace(/\s+/g, " ").trim();
  const digits = value.replace(/\D/g, "");
  // +62 812… dan 0812… adalah nomor HP yang sama.
  return type === "HP" ? digits.replace(/^62/, "0") : digits;
}
