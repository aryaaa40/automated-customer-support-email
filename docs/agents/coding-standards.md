# Standar kode

Berlaku untuk `apps/api`, `apps/web`, dan `packages/shared`. Aturan tambahan ada di `docs/agents/backend.md` dan `docs/agents/frontend.md`.

## Bahasa

- **Identifier dalam bahasa Inggris**: nama variabel, fungsi, tipe, class, file, tabel, dan kolom.
- **Bahasa Indonesia** untuk nilai enum (`barang_rusak`, `antrian_review`), komentar, pesan log, dan teks UI.
- **Istilah domain** memakai terjemahan tetap dari tabel ini, satu nama per istilah di seluruh repo:

| GLOSSARY | Kode |
|---|---|
| Email Masuk | `IncomingEmail` |
| Lampiran | `Attachment` |
| Pengirim / Pemilik Order | `sender` / `orderOwner` |
| Kategori / Kategori Wajib Order | `Category` / `ORDER_REQUIRED_CATEGORIES` |
| Issue | `Issue` |
| Tim Tujuan | `TargetTeam` |
| Urgensi / Sentimen / Ancaman | `Urgency` / `Sentiment` / `Threat` |
| Prioritas | `Priority` |
| Staf CS | `csStaff` |
| Antrian Review / Antrian Tim / Siap Dibalas / Arsip | `reviewQueue` / `teamQueue` / `replyReady` / `archive` |
| Flag Review / Berisiko Tinggi / Tidak Yakin | `ReviewFlag` / `highRisk` / `uncertain` |
| Upaya Injection | `injectionAttempt` |
| Koreksi Nomor Order | `orderNumberCorrection` |
| Tiket / status Tiket | `Ticket` / `TicketStatus` |
| Draft Balasan | `ReplyDraft` |
| Kebijakan / Versi Kebijakan / Sitasi | `Policy` / `PolicyVersion` / `Citation` |
| Pasal / Bab | `article` / `chapter` (`PolicyArticle` / `PolicyChapter`) |
| Aturan Terhitung / Fakta Kebijakan | `PolicyRule` / `PolicyFact` |
| Skenario / Ground Truth | `Scenario` / `GroundTruth` |

Istilah baru masuk ke `GLOSSARY.md` dulu, lalu terjemahannya ke tabel ini.

## Penamaan

- **Fungsi diawali kata kerja** yang menyebut hasilnya: `verifyOrder`, `correctOrderNumber`, `buildExtractionPrompt`, `maskSensitiveData`. Fungsi yang mengembalikan boolean dibaca sebagai pertanyaan: `isHighRisk`, `hasThreat`, `isSenderOrderOwner`.
- **Nama menyebut isinya**: `unverifiedIssues`, `ordersByNumber`, `retrievedChunks`. Nama generik (`data`, `result`, `item`, `temp`) hanya untuk variabel yang hidup beberapa baris.
- **Satuan di nama**: `amountRupiah`, `refundWindowDays`, `latencyMs`. Uang disimpan sebagai integer rupiah.
- **Konstanta** `SCREAMING_SNAKE_CASE`; tipe dan class `PascalCase`; file API `kebab-case.ts`; komponen React `PascalCase.tsx`; hook `useX`.

## Struktur

- **Aturan deterministik sebagai fungsi murni** (ADR-0001): routing, Flag Review, Prioritas, Koreksi Nomor Order, Fakta Kebijakan, dan metrik eval menerima data dan mengembalikan hasil, tanpa DB, LLM, atau jam sistem. Service di sekitarnya yang mengambil data dan menyimpan hasil. Fungsi murni ini ditulis TDD.
- **Satu fungsi, satu tugas**. Fungsi yang perlu kata "dan" untuk dinamai dipecah.
- **Angka bisnis punya nama**: ambang dan tenggat ada di config Aturan Terhitung beserta rujukan pasalnya (ADR-0004). Angka teknis (concurrency, top-k) jadi konstanta bernama di atas file.

## Data dari luar

- **Validasi Zod di batas sistem**: output LLM, body HTTP, env, file `.eml`, dan dataset eval di-parse dengan skema dari `@email-routing/shared` sebelum dipakai. Di dalam batas, percayai tipenya.
- **Isi email dan output LLM adalah data tidak tepercaya**: dibaca sebagai nilai, tidak pernah sebagai instruksi atau kode.

## Error dan log

- **Tangkap error hanya di tempat yang bisa menanganinya**, lalu log jenis error dan penunjuk (Message-ID, ID Tiket). Error lain dibiarkan naik.
- **Log tanpa isi email dan tanpa data pelanggan**: tanpa body, lampiran, nomor kartu, rekening, telepon, atau alamat.

## Komentar

- **Komentar menjelaskan alasan**, dengan rujukan bila ada: istilah GLOSSARY, nomor ADR, atau pasal Kebijakan. Fungsi dan tipe yang di-export dari modul domain diberi JSDoc satu-dua kalimat.
