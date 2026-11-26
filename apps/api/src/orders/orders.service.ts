import type { OrderDto } from "@email-routing/shared";
import { Inject, Injectable } from "@nestjs/common";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { DATABASE, type Database } from "../db/database";
import { customers, orderItems, orders, paymentTransactions, products } from "../db/schema";

/** Satu order lengkap beserta email Pemilik Order-nya. */
export interface OrderRecord extends OrderDto {
  orderOwnerEmail: string;
}

/** Akses baca ke database order. */
@Injectable()
export class OrdersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Semua nomor order milik `orderOwnerEmail`, dibandingkan case-insensitive
   * seperti verifikasi Pemilik Order. Sumber kandidat Koreksi Nomor Order.
   */
  async listOrderNumbersByOwner(orderOwnerEmail: string): Promise<string[]> {
    const rows = await this.db
      .select({ orderNumber: orders.orderNumber })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(sql`lower(${customers.email})`, orderOwnerEmail.trim().toLowerCase()))
      .orderBy(asc(orders.orderNumber));
    return rows.map((row) => row.orderNumber);
  }

  /** Order lengkap untuk nomor-nomor order yang persis sama; yang tidak ada tidak muncul di Map. */
  async findByNumbers(orderNumbers: string[]): Promise<Map<string, OrderRecord>> {
    const ordersByNumber = new Map<string, OrderRecord>();
    if (orderNumbers.length === 0) return ordersByNumber;

    const orderRows = await this.db
      .select({ order: orders, orderOwnerEmail: customers.email })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(inArray(orders.orderNumber, orderNumbers));
    if (orderRows.length === 0) return ordersByNumber;

    const orderIds = orderRows.map((row) => row.order.id);
    const [itemRows, transactionRows] = await Promise.all([
      this.db
        .select({
          orderId: orderItems.orderId,
          productName: products.name,
          productCategory: products.category,
          quantity: orderItems.quantity,
          unitPriceRupiah: orderItems.unitPriceRupiah,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(inArray(orderItems.orderId, orderIds))
        .orderBy(asc(products.name)),
      this.db
        .select()
        .from(paymentTransactions)
        .where(inArray(paymentTransactions.orderId, orderIds))
        .orderBy(asc(paymentTransactions.createdAt)),
    ]);

    for (const { order, orderOwnerEmail } of orderRows) {
      ordersByNumber.set(order.orderNumber, {
        orderOwnerEmail,
        orderNumber: order.orderNumber,
        orderedAt: order.orderedAt.toISOString(),
        totalRupiah: order.totalRupiah,
        paymentStatus: order.paymentStatus,
        shippingStatus: order.shippingStatus,
        deliveredAt: order.deliveredAt?.toISOString() ?? null,
        items: itemRows
          .filter((item) => item.orderId === order.id)
          .map(({ orderId: _, ...item }) => item),
        transactions: transactionRows
          .filter((transaction) => transaction.orderId === order.id)
          .map((transaction) => ({
            reference: transaction.reference,
            method: transaction.method,
            amountRupiah: transaction.amountRupiah,
            status: transaction.status,
            createdAt: transaction.createdAt.toISOString(),
          })),
      });
    }
    return ordersByNumber;
  }
}
