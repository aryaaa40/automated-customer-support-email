/** Awalan nomor order di database order, mis. `ORD-1032`. */
export const ORDER_NUMBER_PREFIX = "ORD-";

/** Jarak edit maksimum supaya sebuah order milik Pengirim dianggap kandidat Koreksi Nomor Order. */
export const MAX_CORRECTION_DISTANCE = 1;

const PREFIX_LETTERS = ORDER_NUMBER_PREFIX.replace("-", "");
/** Spasi dan strip (termasuk en/em dash) yang sering muncul di tengah nomor order. */
const SEPARATORS = /[\s\-–—_]/g;
/** Huruf yang tertukar dengan angka saat diketik atau dibaca dari gambar. */
const DIGIT_LOOKALIKES: Record<string, string> = { O: "0", I: "1", L: "1" };

/**
 * Bentuk baku nomor order sebelum dicari di database: huruf besar, tanpa
 * spasi dan strip, huruf mirip angka di bagian angka diganti (O→0, I/l→1),
 * lalu awalan `ORD-` dipasang lagi. Contoh: `ord 1O3l` → `ORD-1031`.
 * Normalisasi ini bukan Koreksi Nomor Order dan tidak dicatat di Tiket.
 */
export function normalizeOrderNumber(orderNumber: string): string {
  const compact = orderNumber.toUpperCase().replace(SEPARATORS, "");
  const digits = compact.startsWith(PREFIX_LETTERS) ? compact.slice(PREFIX_LETTERS.length) : compact;
  return ORDER_NUMBER_PREFIX + digits.replace(/[OIL]/g, (letter) => DIGIT_LOOKALIKES[letter]!);
}

/**
 * Jarak edit Optimal String Alignment (Damerau-Levenshtein terbatas): jumlah
 * minimum sisip, hapus, ganti satu karakter, atau tukar dua karakter
 * bersebelahan. `ORD-1043` ↔ `ORD-1034` berjarak 1, bukan 2 seperti
 * Levenshtein biasa, supaya digit yang tertukar ikut tertangkap.
 */
export function calculateEditDistance(a: string, b: string): number {
  // distance[i][j] = jarak antara a[0..i) dan b[0..j).
  const distance = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        distance[i - 1]![j]! + 1,
        distance[i]![j - 1]! + 1,
        distance[i - 1]![j - 1]! + substitutionCost,
      );
      const isAdjacentSwap = i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1];
      if (isAdjacentSwap) best = Math.min(best, distance[i - 2]![j - 2]! + 1);
      distance[i]![j] = best;
    }
  }
  return distance[a.length]![b.length]!;
}

/**
 * Kandidat Koreksi Nomor Order: order milik Pengirim yang berjarak edit ≤ 1
 * dari nomor order yang sudah dinormalisasi. Hanya order milik Pengirim yang
 * dipertimbangkan, supaya salah ketik tidak pernah diarahkan ke order
 * pelanggan lain (GLOSSARY: Koreksi Nomor Order).
 */
export function findCorrectionCandidates(
  normalizedOrderNumber: string,
  senderOrderNumbers: readonly string[],
): string[] {
  return senderOrderNumbers
    .filter((candidate) => calculateEditDistance(normalizedOrderNumber, candidate) <= MAX_CORRECTION_DISTANCE)
    .sort();
}
