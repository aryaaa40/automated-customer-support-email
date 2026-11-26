import type {
  PaymentMethod,
  PaymentStatus,
  ProductCategory,
  ShippingStatus,
  TransactionStatus,
} from "@email-routing/shared";
import type { Database } from "../db/database";
import { customers, orderItems, orders, paymentTransactions, products } from "../db/schema";

/** Isi database order. Relasi memakai kunci alami (email, SKU) supaya data mudah ditulis tangan. */
export interface SeedData {
  customers: SeedCustomer[];
  products: SeedProduct[];
  orders: SeedOrder[];
}

/** Pelanggan; email-nya dibandingkan dengan Pengirim saat verifikasi. */
export interface SeedCustomer {
  name: string;
  email: string;
}

/** Produk beserta kategori produk dan harganya. */
export interface SeedProduct {
  sku: string;
  name: string;
  category: ProductCategory;
  priceRupiah: number;
}

/** Satu item order: produk (lewat SKU), jumlah, dan harga satuan saat order dibuat. */
export interface SeedOrderItem {
  sku: string;
  quantity: number;
  unitPriceRupiah: number;
}

/** Satu transaksi pembayaran sebuah order. */
export interface SeedTransaction {
  reference: string;
  method: PaymentMethod;
  amountRupiah: number;
  status: TransactionStatus;
  createdAt: Date;
}

/** Satu order; totalnya dihitung dari item saat ditulis. */
export interface SeedOrder {
  orderNumber: string;
  /** Email Pemilik Order; harus ada di `customers`. */
  orderOwnerEmail: string;
  orderedAt: Date;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  deliveredAt: Date | null;
  items: SeedOrderItem[];
  transactions: SeedTransaction[];
}

/** Total order: jumlah quantity × harga satuan semua item. */
export function calculateOrderTotalRupiah(items: SeedOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPriceRupiah, 0);
}

/**
 * Ganti seluruh isi database order dengan `data` dalam satu transaksi.
 * Tiket tidak tersentuh: Issue merujuk order lewat nomor order, jadi seed
 * yang sama bisa dijalankan ulang dengan aman.
 */
export async function writeSeed(db: Database, data: SeedData): Promise<void> {
  await db.transaction(async (tx) => {
    // Cascade menghapus orders, order_items, dan payment_transactions.
    await tx.delete(customers);
    await tx.delete(products);

    const customerIdsByEmail = new Map<string, string>();
    if (data.customers.length > 0) {
      const rows = await tx
        .insert(customers)
        .values(data.customers)
        .returning({ id: customers.id, email: customers.email });
      for (const row of rows) customerIdsByEmail.set(row.email, row.id);
    }

    const productIdsBySku = new Map<string, string>();
    if (data.products.length > 0) {
      const rows = await tx
        .insert(products)
        .values(data.products)
        .returning({ id: products.id, sku: products.sku });
      for (const row of rows) productIdsBySku.set(row.sku, row.id);
    }

    for (const order of data.orders) {
      const customerId = customerIdsByEmail.get(order.orderOwnerEmail);
      if (!customerId) throw new Error(`Seed: pelanggan untuk ${order.orderNumber} tidak ada`);

      const [saved] = await tx
        .insert(orders)
        .values({
          orderNumber: order.orderNumber,
          customerId,
          orderedAt: order.orderedAt,
          totalRupiah: calculateOrderTotalRupiah(order.items),
          paymentStatus: order.paymentStatus,
          shippingStatus: order.shippingStatus,
          deliveredAt: order.deliveredAt,
        })
        .returning({ id: orders.id });

      if (order.items.length > 0) {
        await tx.insert(orderItems).values(
          order.items.map((item) => {
            const productId = productIdsBySku.get(item.sku);
            if (!productId) throw new Error(`Seed: produk ${item.sku} untuk ${order.orderNumber} tidak ada`);
            return { orderId: saved!.id, productId, quantity: item.quantity, unitPriceRupiah: item.unitPriceRupiah };
          }),
        );
      }
      if (order.transactions.length > 0) {
        await tx
          .insert(paymentTransactions)
          .values(order.transactions.map((transaction) => ({ ...transaction, orderId: saved!.id })));
      }
    }
  });
}
