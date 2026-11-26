import type { OrderVerificationDto, TransactionStatus } from "@email-routing/shared";
import {
  formatRupiah,
  formatTanggal,
  paymentMethodLabel,
  paymentStatusLabel,
  productCategoryLabel,
  shippingStatusLabel,
  transactionStatusLabel,
} from "./labels";

const TRANSACTION_STATUS_CLASS: Record<TransactionStatus, string> = {
  berhasil: "ok",
  gagal: "flag",
  menunggu: "muted",
};

/** Hasil verifikasi order satu Issue: order ada atau tidak, kecocokan Pemilik Order, status order. */
export function OrderVerification({ verification }: { verification: OrderVerificationDto }) {
  if (verification.status === "tanpa_nomor") {
    return <p className="verification muted">Verifikasi order: tidak ada nomor order.</p>;
  }
  if (verification.status === "tidak_ditemukan") {
    return (
      <p className="verification flag">
        Order <code>{verification.orderNumber}</code> tidak ditemukan di database.
      </p>
    );
  }

  const { order } = verification;
  return (
    <div className="verification">
      <h4>
        Order <code>{order.orderNumber}</code>
      </h4>
      <dl>
        <dt>Pemilik Order</dt>
        <dd>
          {verification.orderOwnerEmail}{" "}
          {verification.isSenderOrderOwner ? (
            <span className="ok">✓ sama dengan Pengirim</span>
          ) : (
            <span className="flag">✗ bukan Pengirim</span>
          )}
        </dd>
        <dt>Tanggal order</dt>
        <dd>{formatTanggal(order.orderedAt)}</dd>
        <dt>Total</dt>
        <dd>{formatRupiah(order.totalRupiah)}</dd>
        <dt>Pembayaran</dt>
        <dd>{paymentStatusLabel[order.paymentStatus]}</dd>
        <dt>Pengiriman</dt>
        <dd>
          {shippingStatusLabel[order.shippingStatus]}
          {order.deliveredAt && <span className="muted"> · diterima {formatTanggal(order.deliveredAt)}</span>}
        </dd>
        <dt>Item</dt>
        <dd>
          {order.items.map((item, i) => (
            <div key={i}>
              {item.quantity} × {item.productName}{" "}
              <span className="muted">
                ({productCategoryLabel[item.productCategory]}, {formatRupiah(item.unitPriceRupiah)})
              </span>
            </div>
          ))}
        </dd>
        <dt>Transaksi</dt>
        <dd>
          {order.transactions.length === 0 ? (
            <span className="muted">tidak ada</span>
          ) : (
            order.transactions.map((transaction) => (
              <div key={transaction.reference}>
                <code>{transaction.reference}</code> {paymentMethodLabel[transaction.method]}{" "}
                {formatRupiah(transaction.amountRupiah)}{" "}
                <span className={TRANSACTION_STATUS_CLASS[transaction.status]}>
                  {transactionStatusLabel[transaction.status]}
                </span>{" "}
                <span className="muted">{formatTanggal(transaction.createdAt)}</span>
              </div>
            ))
          )}
        </dd>
      </dl>
    </div>
  );
}
