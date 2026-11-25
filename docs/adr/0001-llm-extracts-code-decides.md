# LLM hanya mengekstrak, kode yang memutuskan

LLM hanya dipakai untuk membaca Email Masuk dan Lampiran, lalu menghasilkan JSON tervalidasi skema (Kategori, urgensi, sentimen, data terekstrak, sinyal ancaman), dan setelah itu untuk menulis Draft Balasan. LLM tidak diberi tool atau aksi apa pun. Lookup order, koreksi typo nomor order, cek Pemilik Order, routing ke Tim Tujuan, prioritas, dan semua aturan Flag Review dijalankan oleh kode deterministik.

Alasannya: isi email adalah data tidak tepercaya. Kalau prompt injection berhasil memengaruhi keluaran LLM, model tetap tidak punya kewenangan untuk menyetujui refund, mengirim balasan, atau melewati Antrian Review. Aturan yang wajib (nominal > Rp1.000.000, order tidak ditemukan, Pengirim bukan Pemilik Order) juga harus dijamin 100%, dan jaminan itu tidak bisa diserahkan ke model yang probabilistik.

## Consequences

- Prompt pertahanan injection tetap ditulis, tapi itu lapisan kedua, bukan satu-satunya pertahanan.
- Kebenaran routing bergantung pada akurasi klasifikasi Kategori. Tabel routing sendiri tidak pernah "salah".
