# Backend (`apps/api`)

NestJS (HTTP + CLI lewat standalone application context), Drizzle + PostgreSQL/pgvector, Zod. Standar umum ada di `docs/agents/coding-standards.md`.

## Struktur per kemampuan

Satu folder = satu modul NestJS = satu langkah di alur pipeline atau satu area dashboard:

```
src/
  ingestion/      orkestrasi process-inbox: menjalankan langkah pipeline berurutan
  email-source/   port EmailSource + FileSource
  llm/            port LlmClient + adapter OpenAI + fake
  masking/        masking data sensitif sebelum LLM
  extraction/     prompt + skema → Extraction
  orders/         seed, verifikasi order, Koreksi Nomor Order
  rules/          routing, Flag Review, Prioritas
  policies/       Aturan Terhitung → Fakta Kebijakan, ingestion PDF, retriever
  drafting/       Draft Balasan dengan Sitasi
  tickets/        HTTP Tiket + transisi status
  auth/           login + peran
  eval/           harness eval, metrik, laporan
  db/             skema Drizzle + koneksi
```

Folder baru dibuat saat tiket pertamanya dikerjakan.

## Peran file dalam modul

- **Fungsi murni** (`verify-order.ts`, `routing.ts`): logika aturan, tanpa decorator Nest, tanpa import dari `db/` atau `llm/`.
- **Service** (`orders.service.ts`): mengambil data, memanggil fungsi murni, menyimpan hasil. Query Drizzle tinggal di service modul pemilik tabelnya.
- **Controller** (`tickets.controller.ts`): validasi input dengan Zod, panggil satu method service, kembalikan DTO dari `@email-routing/shared`. Mapping ke HTTP exception terjadi di sini.
- **Port** (`llm-client.ts`): interface + token injeksi, hanya untuk I/O eksternal yang punya versi fake di test (LLM, sumber email).

## Aturan

- **Pipeline terbaca seperti alurnya**: `ingestion` memanggil langkah dalam urutan spec (mask → extract → verify → rules → policy facts → retrieve → draft → save); setiap langkah punya input dan output bertipe.
- **Tabel ditulis oleh satu modul pemiliknya**; modul lain memanggil service pemilik itu untuk menulis.
- **Hasil yang diharapkan dikembalikan sebagai nilai**: "order tidak ditemukan" atau "nomor ambigu" adalah union bertipe (`{ status: "not_found" }`). Exception hanya untuk kegagalan tak terduga (DB mati, output LLM tidak valid setelah retry).
- **Menyimpan satu Tiket dalam satu transaksi** bersama Issue dan Lampiran-nya.
- **Response API berupa DTO**, dipetakan dari baris DB; data Pemilik Order ditampilkan tersamar.
- **Migrasi lewat `drizzle-kit generate`**; migrasi yang sudah ter-commit tidak diubah, perubahan skema dibuat sebagai migrasi baru.
- **Endpoint REST**: resource jamak (`/tickets/:id`), aksi workflow sebagai sub-resource `POST` (`/tickets/:id/forward`, `/tickets/:id/archive`).

## Penamaan method

- `findX` mengembalikan `X | null`; `getX` melempar error bila tidak ada; `listX` mengembalikan array; `countX` mengembalikan angka.
- `createX`, `updateX`, dan kata kerja workflow (`forwardTicket`, `archiveTicket`, `markReplySent`) untuk perubahan.
- Class service dinamai menurut modulnya (`TicketsService`); class dengan satu tugas dinamai menurut tugas itu (`OrderVerifier`, `Extractor`).
