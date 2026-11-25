# Automated Customer Support Email

Sistem yang membaca email masuk ke inbox CS sebuah e-commerce (beserta lampiran PDF/gambar), lalu mengubahnya menjadi Tiket yang sudah diklasifikasikan, diverifikasi ke database order, diarahkan ke Tim Tujuan, dan dilengkapi Draft Balasan sesuai Kebijakan. Sistem tidak pernah menyetujui refund atau mengirim balasan sendiri.

Sebelum mengerjakan apa pun, baca `GLOSSARY.md` dan ADR di `docs/adr/`.

Pemilik repo sedang belajar LLM dan RAG. Sebelum menulis kode untuk konsep yang baru, jelaskan dulu konsepnya dan alasan pemilihannya, dengan contoh konkret.

## Agent skills

### Issue tracker

Issues dan spec ada di GitHub Issues (`aryaaa40/automated-customer-support-email`), diakses lewat `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Lima label bawaan: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: satu `GLOSSARY.md` + `docs/adr/` di root repo. See `docs/agents/domain.md`.
