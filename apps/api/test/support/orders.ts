import type { SeedData } from "../../src/orders/seed";

/**
 * Database order fixture untuk Seam 1, ditulis tangan.
 * Email Budi sengaja ditulis dengan huruf besar-kecil campuran.
 */
export const ORDER_FIXTURE: SeedData = {
  customers: [
    { name: "Budi Santoso", email: "Budi.Santoso@Pelanggan.TEST" },
    { name: "Sari Wulandari", email: "sari@pelanggan.test" },
  ],
  products: [
    { sku: "DEK-VAS-01", name: "Vas Keramik", category: "dekorasi_rumah", priceRupiah: 125_000 },
    { sku: "ELK-BLD-01", name: "Blender 2L", category: "elektronik", priceRupiah: 450_000 },
  ],
  orders: [
    {
      orderNumber: "ORD-1001",
      orderOwnerEmail: "Budi.Santoso@Pelanggan.TEST",
      orderedAt: new Date("2026-11-10T03:00:00Z"),
      paymentStatus: "lunas",
      shippingStatus: "diterima",
      deliveredAt: new Date("2026-11-14T07:30:00Z"),
      items: [{ sku: "DEK-VAS-01", quantity: 2, unitPriceRupiah: 125_000 }],
      transactions: [
        {
          reference: "TRX-0001",
          method: "transfer_bank",
          amountRupiah: 250_000,
          status: "berhasil",
          createdAt: new Date("2026-11-10T03:05:00Z"),
        },
      ],
    },
    {
      orderNumber: "ORD-1002",
      orderOwnerEmail: "sari@pelanggan.test",
      orderedAt: new Date("2026-11-18T09:00:00Z"),
      paymentStatus: "lunas",
      shippingStatus: "dikirim",
      deliveredAt: null,
      items: [{ sku: "ELK-BLD-01", quantity: 1, unitPriceRupiah: 450_000 }],
      transactions: [
        {
          reference: "TRX-0002",
          method: "e_wallet",
          amountRupiah: 450_000,
          status: "berhasil",
          createdAt: new Date("2026-11-18T09:01:00Z"),
        },
      ],
    },
  ],
};
