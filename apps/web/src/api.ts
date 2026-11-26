import type { TicketDetail, TicketSummary } from "@email-routing/shared";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export const api = {
  tickets: () => get<TicketSummary[]>("/tickets"),
  ticket: (id: string) => get<TicketDetail>(`/tickets/${id}`),
};
