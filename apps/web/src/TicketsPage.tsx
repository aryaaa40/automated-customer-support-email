import { Link } from "react-router";
import { api } from "./api";
import { formatTanggal, kategoriLabel, statusLabel } from "./labels";
import { useAsync } from "./useAsync";

export function TicketsPage() {
  const state = useAsync(api.tickets, []);

  return (
    <main>
      <h1>Tiket</h1>
      {state.status === "loading" && <p className="muted">Memuat…</p>}
      {state.status === "error" && <p className="error">Gagal memuat Tiket: {state.error}</p>}
      {state.status === "ok" && state.data.length === 0 && (
        <p className="muted">
          Belum ada Tiket. Jalankan <code>pnpm process-inbox</code>.
        </p>
      )}
      {state.status === "ok" && state.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Masuk</th>
              <th>Pengirim</th>
              <th>Subjek</th>
              <th>Issue</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((t) => (
              <tr key={t.id}>
                <td className="nowrap">{formatTanggal(t.receivedAt)}</td>
                <td>{t.sender}</td>
                <td>
                  <Link to={`/tickets/${t.id}`}>{t.subject || "(tanpa subjek)"}</Link>
                </td>
                <td>
                  {t.categories.map((c, i) => (
                    <span key={i} className="chip">
                      {kategoriLabel[c]}
                    </span>
                  ))}
                </td>
                <td>
                  <span className={`status status-${t.status}`}>{statusLabel[t.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
