import type { Bersumber } from "@email-routing/shared";
import { Link, useParams } from "react-router";
import { api } from "./api";
import { OrderVerification } from "./OrderVerification";
import { formatTanggal, kategoriLabel, sentimenLabel, statusLabel, urgensiLabel } from "./labels";
import { useAsync } from "./useAsync";

function Data<T extends string | number>({ label, data }: { label: string; data: Bersumber<T> | null }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {data === null ? (
          <span className="muted">tidak ada</span>
        ) : (
          <>
            {data.value} <span className="source">{data.source}</span>
          </>
        )}
      </dd>
    </>
  );
}

export function TicketDetailPage() {
  const { id = "" } = useParams();
  const state = useAsync(() => api.ticket(id), [id]);

  if (state.status === "loading") return <main className="muted">Memuat…</main>;
  if (state.status === "error") return <main className="error">Gagal memuat Tiket: {state.error}</main>;
  const t = state.data;

  return (
    <main>
      <p>
        <Link to="/">← Semua Tiket</Link>
      </p>
      <h1>{t.email.subject || "(tanpa subjek)"}</h1>
      <p className="meta">
        <span className={`status status-${t.status}`}>{statusLabel[t.status]}</span>
        <span>Sentimen: {sentimenLabel[t.sentiment]}</span>
        {t.threat.present && <span className="flag">Ancaman: “{t.threat.evidence}”</span>}
        {t.injectionAttempt.present && (
          <span className="flag">Upaya Injection: “{t.injectionAttempt.evidence}”</span>
        )}
        {t.ambiguous.isAmbiguous && <span className="flag">Ambigu: {t.ambiguous.reason}</span>}
      </p>

      <h2>Issue ({t.issues.length})</h2>
      {t.issues.map((issue) => (
        <section key={issue.id} className="card">
          <h3>
            {kategoriLabel[issue.category]} <span className="muted">· Urgensi {urgensiLabel[issue.urgency]}</span>
          </h3>
          <p>{issue.summary}</p>
          <dl>
            <Data label="Nomor order" data={issue.orderNumber} />
            <Data label="Nominal (Rp)" data={issue.amount} />
            <Data label="Tanggal" data={issue.date} />
            <Data label="Produk" data={issue.productName} />
          </dl>
          <OrderVerification verification={issue.verification} />
        </section>
      ))}

      <h2>Email Masuk</h2>
      <section className="card">
        <dl>
          <dt>Pengirim</dt>
          <dd>{t.email.sender}</dd>
          <dt>Masuk</dt>
          <dd>{formatTanggal(t.email.receivedAt)}</dd>
          <dt>Message-ID</dt>
          <dd>
            <code>{t.email.messageId}</code>
          </dd>
          <dt>Lampiran</dt>
          <dd>
            {t.email.attachments.length === 0
              ? <span className="muted">tidak ada</span>
              : t.email.attachments.map((a) => (
                  <div key={a.filename}>
                    {a.filename} <span className="muted">({a.contentType}, {Math.ceil(a.size / 1024)} KB)</span>
                  </div>
                ))}
          </dd>
        </dl>
        <pre className="body">{t.email.body}</pre>
      </section>
    </main>
  );
}
