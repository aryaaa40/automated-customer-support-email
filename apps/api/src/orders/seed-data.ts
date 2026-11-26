import { PAYMENT_METHODS, type PaymentStatus, type ShippingStatus } from "@email-routing/shared";
import {
  calculateOrderTotalRupiah,
  type SeedCustomer,
  type SeedData,
  type SeedOrder,
  type SeedProduct,
  type SeedTransaction,
} from "./seed";

/**
 * Data order dummy yang deterministik: PRNG dengan seed tetap dan tanggal
 * jangkar tetap (tanpa Date.now()), jadi setiap pemanggilan menghasilkan data
 * yang persis sama. Dataset Generator (#9) membuat Skenario dari order ini.
 */

const PRNG_SEED = 20_261_126;
/** Semua tanggal order dihitung mundur dari jangkar ini (25 Nov 2026). */
const ANCHOR_MS = Date.UTC(2026, 10, 25);
const ORDER_COUNT = 150;
const FIRST_ORDER_NUMBER = 1001;
const MAX_ORDER_AGE_DAYS = 100;

/** Sebagian order masih baru (≤ 7 hari) supaya ada yang belum lunas, diproses, atau di jalan. */
const RECENT_ORDER_SHARE = 0.2;
const RECENT_ORDER_MAX_AGE_DAYS = 7;
/** Jumlah produk per order: 60% satu, 30% dua, 10% tiga. */
const SINGLE_PRODUCT_SHARE = 0.6;
const TWO_PRODUCTS_SHARE = 0.3;
/** Produk murah kadang dibeli dua; produk mahal selalu satu. */
const DOUBLE_QUANTITY_SHARE = 0.25;
const EXPENSIVE_PRODUCT_RUPIAH = 1_000_000;

/** Pembayaran: baru dan belum dibayar, gagal, atau dikembalikan (refund). */
const UNPAID_SHARE_OF_NEW_ORDERS = 0.15;
const NEW_ORDER_MAX_AGE_DAYS = 3;
const FAILED_PAYMENT_SHARE = 0.04;
const REFUNDED_SHARE = 0.05;
const REFUND_MIN_AGE_DAYS = 10;
/** Pembayaran yang sempat gagal sekali sebelum berhasil. */
const RETRIED_PAYMENT_SHARE = 0.1;
/** Double charge: dana terpotong dua kali (kasus Masalah Pembayaran). */
const DOUBLE_CHARGE_SHARE = 0.04;
/** Paket lama yang tertahan di kurir (kasus Pengiriman Bermasalah). */
const STUCK_SHIPMENT_SHARE = 0.06;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** Email pelanggan: nama depan huruf kecil @pelanggan.example (sama dengan contoh di data/inbox). */
const CUSTOMER_NAMES = [
  "Budi Santoso", "Sari Wulandari", "Andi Pratama", "Rina Kusuma", "Dodi Hermawan",
  "Siti Rahmawati", "Agus Setiawan", "Dewi Lestari", "Rizky Ramadhan", "Putri Anggraini",
  "Hendra Gunawan", "Maya Sari", "Fajar Nugroho", "Indah Permata", "Yoga Saputra",
  "Nurul Hidayah", "Bayu Wicaksono", "Lina Marlina", "Arif Hakim", "Wulan Septiani",
  "Teguh Santika", "Ratna Dewanti", "Eko Purnomo", "Fitri Handayani", "Galih Prakoso",
  "Intan Maharani", "Joko Susilo", "Kartika Ayu", "Lukman Hakim", "Mega Puspita",
];

const PRODUCTS: SeedProduct[] = [
  { sku: "ELK-BLD-01", name: "Blender Kaca 2L", category: "elektronik", priceRupiah: 1_250_000 },
  { sku: "ELK-RCK-01", name: "Rice Cooker Digital 1.8L", category: "elektronik", priceRupiah: 1_450_000 },
  { sku: "ELK-HDP-01", name: "Headphone Bluetooth ANC", category: "elektronik", priceRupiah: 1_890_000 },
  { sku: "ELK-PWB-01", name: "Power Bank 20.000 mAh", category: "elektronik", priceRupiah: 349_000 },
  { sku: "ELK-SPK-01", name: "Speaker Bluetooth Mini", category: "elektronik", priceRupiah: 275_000 },
  { sku: "ELK-KPS-01", name: "Kipas Angin Berdiri 16 inci", category: "elektronik", priceRupiah: 425_000 },
  { sku: "DAP-WJN-01", name: "Wajan Anti Lengket 28 cm", category: "peralatan_dapur", priceRupiah: 189_000 },
  { sku: "DAP-PSU-01", name: "Set Pisau Dapur 5 pcs", category: "peralatan_dapur", priceRupiah: 235_000 },
  { sku: "DAP-TPR-01", name: "Toples Kaca Kedap Udara (set 3)", category: "peralatan_dapur", priceRupiah: 99_000 },
  { sku: "DAP-TKO-01", name: "Teko Listrik Stainless 1.7L", category: "peralatan_dapur", priceRupiah: 215_000 },
  { sku: "FSH-KAO-01", name: "Kaos Hitam Polos", category: "fashion", priceRupiah: 79_000 },
  { sku: "FSH-KMJ-01", name: "Kemeja Flanel Kotak", category: "fashion", priceRupiah: 165_000 },
  { sku: "FSH-SPT-01", name: "Sepatu Lari Ringan", category: "fashion", priceRupiah: 549_000 },
  { sku: "FSH-TAS-01", name: "Tas Ransel Laptop 15 inci", category: "fashion", priceRupiah: 319_000 },
  { sku: "FSH-JKT-01", name: "Jaket Parasut Waterproof", category: "fashion", priceRupiah: 289_000 },
  { sku: "DEK-VAS-01", name: "Vas Keramik", category: "dekorasi_rumah", priceRupiah: 250_000 },
  { sku: "DEK-LMP-01", name: "Lampu Tidur Rotan", category: "dekorasi_rumah", priceRupiah: 145_000 },
  { sku: "DEK-CRM-01", name: "Cermin Dinding Bulat 60 cm", category: "dekorasi_rumah", priceRupiah: 385_000 },
  { sku: "DEK-KRP-01", name: "Karpet Bulu 120x160", category: "dekorasi_rumah", priceRupiah: 459_000 },
  { sku: "DEK-BNT-01", name: "Sarung Bantal Linen (set 2)", category: "dekorasi_rumah", priceRupiah: 119_000 },
  { sku: "KCN-SRM-01", name: "Serum Vitamin C 30 ml", category: "kecantikan", priceRupiah: 129_000 },
  { sku: "KCN-SNB-01", name: "Sunscreen SPF 50 50 ml", category: "kecantikan", priceRupiah: 89_000 },
  { sku: "KCN-PRF-01", name: "Parfum Eau de Toilette 50 ml", category: "kecantikan", priceRupiah: 359_000 },
  { sku: "KCN-HDR-01", name: "Hair Dryer Lipat", category: "kecantikan", priceRupiah: 239_000 },
];

/** Sumber angka acak deterministik beserta helper-nya. */
interface Random {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

/** Bangun data seed: 30 pelanggan, 24 produk, dan 150 order `ORD-1001` s.d. `ORD-1150`. */
export function buildSeedData(): SeedData {
  const random = createRandom(PRNG_SEED);

  const customers: SeedCustomer[] = CUSTOMER_NAMES.map((name) => ({
    name,
    email: `${name.split(" ")[0]!.toLowerCase()}@pelanggan.example`,
  }));

  let transactionCount = 0;
  const nextTransactionReference = () => `TRX-${String(++transactionCount).padStart(5, "0")}`;

  const orders: SeedOrder[] = [];
  for (let n = 0; n < ORDER_COUNT; n++) {
    const orderOwner = random.pick(customers);
    const ageDays =
      random.next() < RECENT_ORDER_SHARE
        ? random.int(1, RECENT_ORDER_MAX_AGE_DAYS)
        : random.int(RECENT_ORDER_MAX_AGE_DAYS + 1, MAX_ORDER_AGE_DAYS);
    const orderedAt = new Date(
      ANCHOR_MS - ageDays * DAY_MS + random.int(7, 22) * HOUR_MS + random.int(0, 59) * MINUTE_MS,
    );

    const items = chooseItems(random);
    const totalRupiah = calculateOrderTotalRupiah(items);
    const paymentStatus = choosePaymentStatus(random.next(), ageDays);
    const { shippingStatus, deliveredAt } = chooseShipping(random, paymentStatus, ageDays, orderedAt);

    const method = random.pick(PAYMENT_METHODS);
    const paidAt = new Date(orderedAt.getTime() + random.int(2, 50) * MINUTE_MS);
    const createTransaction = (status: SeedTransaction["status"], createdAt: Date): SeedTransaction => ({
      reference: nextTransactionReference(),
      method,
      amountRupiah: totalRupiah,
      status,
      createdAt,
    });

    const transactions: SeedTransaction[] = [];
    if (paymentStatus === "lunas" || paymentStatus === "dikembalikan") {
      if (random.next() < RETRIED_PAYMENT_SHARE) {
        transactions.push(createTransaction("gagal", new Date(paidAt.getTime() - 5 * MINUTE_MS)));
      }
      transactions.push(createTransaction("berhasil", paidAt));
      if (paymentStatus === "lunas" && random.next() < DOUBLE_CHARGE_SHARE) {
        transactions.push(createTransaction("berhasil", new Date(paidAt.getTime() + MINUTE_MS)));
      }
    } else {
      transactions.push(createTransaction(paymentStatus === "gagal" ? "gagal" : "menunggu", paidAt));
    }

    orders.push({
      orderNumber: `ORD-${FIRST_ORDER_NUMBER + n}`,
      orderOwnerEmail: orderOwner.email,
      orderedAt,
      paymentStatus,
      shippingStatus,
      deliveredAt,
      items,
      transactions,
    });
  }

  return { customers, products: PRODUCTS, orders };
}

function chooseItems(random: Random): SeedOrder["items"] {
  const roll = random.next();
  const productCount = roll < SINGLE_PRODUCT_SHARE ? 1 : roll < SINGLE_PRODUCT_SHARE + TWO_PRODUCTS_SHARE ? 2 : 3;
  const chosenProducts = new Set<SeedProduct>();
  while (chosenProducts.size < productCount) chosenProducts.add(random.pick(PRODUCTS));

  return [...chosenProducts].map((product) => ({
    sku: product.sku,
    quantity: product.priceRupiah <= EXPENSIVE_PRODUCT_RUPIAH && random.next() < DOUBLE_QUANTITY_SHARE ? 2 : 1,
    unitPriceRupiah: product.priceRupiah,
  }));
}

function choosePaymentStatus(roll: number, ageDays: number): PaymentStatus {
  if (ageDays <= NEW_ORDER_MAX_AGE_DAYS && roll < UNPAID_SHARE_OF_NEW_ORDERS) return "menunggu";
  if (roll < FAILED_PAYMENT_SHARE) return "gagal";
  if (ageDays >= REFUND_MIN_AGE_DAYS && roll > 1 - REFUNDED_SHARE) return "dikembalikan";
  return "lunas";
}

function chooseShipping(
  random: Random,
  paymentStatus: PaymentStatus,
  ageDays: number,
  orderedAt: Date,
): { shippingStatus: ShippingStatus; deliveredAt: Date | null } {
  if (paymentStatus === "menunggu" || paymentStatus === "gagal") {
    return { shippingStatus: "belum_dikirim", deliveredAt: null };
  }
  if (ageDays <= 1) return { shippingStatus: "diproses", deliveredAt: null };

  const transitDays = random.int(2, 5);
  const isStuck = paymentStatus === "lunas" && random.next() < STUCK_SHIPMENT_SHARE;
  if (isStuck || ageDays <= transitDays) return { shippingStatus: "dikirim", deliveredAt: null };

  return {
    shippingStatus: "diterima",
    deliveredAt: new Date(orderedAt.getTime() + transitDays * DAY_MS + random.int(1, 8) * HOUR_MS),
  };
}

/** PRNG kecil dan deterministik (algoritma mulberry32): seed yang sama → urutan angka yang sama. */
function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return { next, int, pick: (items) => items[int(0, items.length - 1)]! };
}
