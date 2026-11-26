# Frontend (`apps/web`)

React + Vite + TypeScript, react-router, TanStack Query, Tailwind + shadcn/ui.

## Struktur per fitur

Satu folder fitur = satu layar dashboard (nama layar dari `GLOSSARY.md`):

```
src/
  app/                router, providers (QueryClient, auth), layout
  features/
    tickets/          daftar + detail Tiket
    review-queue/     Antrian Review
    reply-ready/      Siap Dibalas
    team-queue/       Antrian Tim
    archive/          Arsip
    auth/             login + peran
  shared/
    ui/               komponen presentasional + komponen shadcn
    lib/              api-client, labels, utils
```

Setiap folder fitur menyimpan halaman, komponennya sendiri, dan `api.ts` berisi hook query/mutation fitur itu.

## Aturan

- **Import satu arah**: fitur mengimpor dari foldernya sendiri dan dari `shared/`. Kode yang dipakai dua fitur dipindah ke `shared/`.
- **Server state di TanStack Query**: data dari API diambil lewat hook di `features/<fitur>/api.ts` (`useTickets`, `useForwardTicket`). Setiap mutation meng-invalidate query key yang terdampak, supaya layar lain ikut segar. State UI lokal tetap di `useState`; user yang login ada di React Context milik `auth/`.
- **Komponen `shared/ui` presentasional**: hanya menerima props. Pengambilan data terjadi di hook fitur.
- **Kontrak dari `@email-routing/shared`**: tipe request/response diimpor dari paket ini, satu sumber untuk API dan web.
- **Styling dengan Tailwind + komponen shadcn** yang di-generate ke `shared/ui`.
- **Teks UI berbahasa Indonesia** memakai istilah `GLOSSARY.md`.

Kode di `src/` yang masih datar dipindah ke struktur ini lewat issue #22.
