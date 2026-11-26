<img src="assets/icon.svg" width="64" height="64" alt="">

# email-routing

Sistem yang membaca Email Masuk ke inbox CS, lalu mengubahnya menjadi Tiket yang sudah diklasifikasikan, diverifikasi, dan diarahkan ke Tim Tujuan. Istilah: [`GLOSSARY.md`](GLOSSARY.md). Keputusan arsitektur: [`docs/adr/`](docs/adr/).

## Menjalankan secara lokal

Butuh Node 22+, pnpm 10, dan Docker.

```sh
pnpm install              # juga mem-build paket shared
cp .env.example .env
pnpm db:up                # Postgres + pgvector di localhost:5433
pnpm seed                 # pelanggan, produk, dan order dummy (deterministik, aman diulang)
pnpm process-inbox        # data/inbox/*.eml → Tiket (migrasi DB otomatis)
pnpm dev:api              # http://localhost:3000/tickets
pnpm dev:web              # http://localhost:5173
```

`pnpm test` menjalankan test (butuh `pnpm db:up`; memakai database `email_routing_test`). `pnpm typecheck` memeriksa semua paket.

## Struktur

| Paket | Isi |
| --- | --- |
| `packages/shared` | Kontrak Extraction (skema Zod) dan tipe respons API |
| `apps/api` | NestJS: HTTP API dan CLI (`process-inbox`) lewat standalone application context |
| `apps/web` | React + Vite: daftar dan detail Tiket |

Alur saat ini: `data/inbox/*.eml` → FileSource → Extractor (adapter LLM palsu, divalidasi skema) → Order Verifier per Issue (order ada atau tidak, Pengirim = Pemilik Order atau tidak) → Email Masuk + Tiket + Issue di Postgres → `GET /tickets` → halaman web.

Database order dummy dibuat `pnpm seed` dari PRNG ber-seed tetap: 30 pelanggan, 24 produk (5 kategori produk), dan 150 order `ORD-1001` s.d. `ORD-1150` beserta item, transaksi pembayaran, status pengiriman, dan tanggal diterima. Menjalankannya ulang menghasilkan data yang sama dan tidak menyentuh Tiket.
