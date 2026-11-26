import { describe, expect, it } from "vitest";
import { calculateEditDistance, normalizeOrderNumber } from "./correct-order-number";
import { type OrderLookup, type OrderOwnership, verifyOrder } from "./verify-order";

const BUDI = "budi@pelanggan.test";
const SARI = "sari@pelanggan.test";

const ORDERS: OrderOwnership[] = [
  { orderNumber: "ORD-1001", orderOwnerEmail: BUDI },
  { orderNumber: "ORD-1034", orderOwnerEmail: BUDI },
  { orderNumber: "ORD-1035", orderOwnerEmail: BUDI },
  { orderNumber: "ORD-1002", orderOwnerEmail: SARI },
];

/** Lookup seperti yang disiapkan service: order yang cocok persis + nomor order milik Pengirim. */
function lookupFor(sender: string, orderNumber: string): OrderLookup {
  const normalized = normalizeOrderNumber(orderNumber);
  return {
    ordersByNumber: new Map(ORDERS.filter((o) => o.orderNumber === normalized).map((o) => [o.orderNumber, o])),
    senderOrderNumbers: ORDERS.filter((o) => o.orderOwnerEmail === sender).map((o) => o.orderNumber),
  };
}

const verify = (sender: string, orderNumber: string) => verifyOrder(sender, orderNumber, lookupFor(sender, orderNumber));

describe("normalizeOrderNumber", () => {
  it.each([
    ["ORD-1032", "ORD-1032"],
    ["ord-1032", "ORD-1032"],
    ["ORD 1032", "ORD-1032"],
    [" ORD - 1032 ", "ORD-1032"],
    ["ORD1032", "ORD-1032"],
    ["ORD–1032", "ORD-1032"],
    ["ORD-1O32", "ORD-1032"],
    ["ORD-I032", "ORD-1032"],
    ["ORD-l032", "ORD-1032"],
    ["ord 1O3l", "ORD-1031"],
    ["1032", "ORD-1032"],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeOrderNumber(raw)).toBe(expected);
  });
});

describe("calculateEditDistance (OSA)", () => {
  it.each([
    ["ORD-1034", "ORD-1034", 0],
    ["ORD-1036", "ORD-1034", 1], // satu digit diganti
    ["ORD-10345", "ORD-1034", 1], // satu digit ditambah
    ["ORD-134", "ORD-1034", 1], // satu digit hilang
    ["ORD-1043", "ORD-1034", 1], // dua digit bersebelahan tertukar
    ["ORD-1012", "ORD-1001", 2],
    ["ORD-1023", "ORD-1032", 1],
    ["ORD-1203", "ORD-1032", 2], // tertukar tapi tidak bersebelahan
  ])("%s ↔ %s = %i", (a, b, expected) => {
    expect(calculateEditDistance(a, b)).toBe(expected);
    expect(calculateEditDistance(b, a)).toBe(expected);
  });
});

describe("verifyOrder: normalisasi dan Koreksi Nomor Order", () => {
  it("nomor order yang cocok persis tidak dikoreksi", () => {
    expect(verify(BUDI, "ORD-1034")).toEqual({
      status: "ditemukan",
      orderNumber: "ORD-1034",
      isSenderOrderOwner: true,
      isOrderNumberCorrected: false,
    });
  });

  it("normalisasi bukan Koreksi: `ord 1O01` ditemukan sebagai ORD-1001 tanpa dicatat sebagai koreksi", () => {
    expect(verify(BUDI, "ord 1O01")).toEqual({
      status: "ditemukan",
      orderNumber: "ORD-1001",
      isSenderOrderOwner: true,
      isOrderNumberCorrected: false,
    });
  });

  it("digit tertukar: ORD-1043 dikoreksi ke ORD-1034, satu-satunya order Pengirim yang berjarak 1", () => {
    expect(verify(BUDI, "ORD-1043")).toEqual({
      status: "ditemukan",
      orderNumber: "ORD-1034",
      isSenderOrderOwner: true,
      isOrderNumberCorrected: true,
    });
  });

  it("dua order Pengirim sama-sama berjarak 1: nomor order ambigu, tidak dikoreksi", () => {
    expect(verify(BUDI, "ORD-1036")).toEqual({
      status: "nomor_ambigu",
      candidateOrderNumbers: ["ORD-1034", "ORD-1035"],
    });
  });

  it("tidak ada order Pengirim yang berjarak ≤ 1: tidak ditemukan", () => {
    expect(verify(BUDI, "ORD-1099")).toEqual({ status: "tidak_ditemukan" });
  });

  it("order milik pelanggan lain tidak pernah menjadi hasil koreksi", () => {
    // ORD-1012 berjarak 1 dari ORD-1002 milik Sari, dan berjarak 2 dari semua order Budi.
    expect(verify(BUDI, "ORD-1012")).toEqual({ status: "tidak_ditemukan" });
    // Kontrol: kalau Sari sendiri yang menulis, nomornya memang dikoreksi.
    expect(verify(SARI, "ORD-1012")).toMatchObject({ status: "ditemukan", orderNumber: "ORD-1002" });
  });

  it("nomor yang cocok persis dengan order pelanggan lain tetap ditemukan, bukan dikoreksi ke order Pengirim", () => {
    expect(verify(BUDI, "ORD-1002")).toEqual({
      status: "ditemukan",
      orderNumber: "ORD-1002",
      isSenderOrderOwner: false,
      isOrderNumberCorrected: false,
    });
  });
});
