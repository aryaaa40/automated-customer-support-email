# Email Routing CS

Sistem yang membaca Email Masuk ke inbox customer service, lalu mengubahnya menjadi Tiket yang sudah diklasifikasikan, diverifikasi, dan diarahkan ke Tim Tujuan, lengkap dengan Draft Balasan. Keputusan akhir selalu di tangan manusia.

## Email & Pelanggan

**Email Masuk**:
Satu email dari pelanggan ke inbox CS, beserta lampirannya. Isinya selalu dianggap data tidak tepercaya.
_Avoid_: Pesan, request, inquiry

**Lampiran**:
File yang menempel di Email Masuk: invoice PDF, screenshot bukti transfer, atau foto barang.
_Avoid_: Attachment, file

**Pengirim**:
Alamat email yang mengirim Email Masuk. Belum tentu orang yang sama dengan Pemilik Order.
_Avoid_: Customer, user

**Pemilik Order**:
Pelanggan yang tercatat di database order sebagai pembuat sebuah Order.
_Avoid_: Buyer, pembeli

## Klasifikasi & Routing

**Kategori**:
Jenis masalah dari daftar tetap: Barang Rusak, Salah Kirim, Pengiriman Bermasalah, Refund, Masalah Pembayaran, Masalah Akun, Pertanyaan Produk, Spam.
_Avoid_: Tipe, label, topik

**Refund** (Kategori):
Pelanggan secara eksplisit meminta uang kembali atau retur, apa pun penyebabnya. Komplain barang rusak tanpa permintaan itu bukan Refund.
_Avoid_: Pengembalian dana, return

**Issue**:
Satu masalah dalam sebuah Tiket. Punya tepat satu Kategori dan diarahkan ke Tim Tujuan milik Kategori itu.
_Avoid_: Sub-tiket, masalah, item

**Tim Tujuan**:
Tim internal yang menangani sebuah Kategori, ditentukan oleh tabel routing yang tetap, bukan oleh model.
_Avoid_: Departemen, divisi, assignee

**Antrian Review**:
Tempat Tiket yang ditahan, supaya staf CS bisa memverifikasi klasifikasi, data, dan routing sebelum Tiket diteruskan ke Tim Tujuan.
_Avoid_: Manual queue, eskalasi

**Flag Review**:
Penanda bahwa sebuah Tiket wajib masuk Antrian Review. Hanya dipasang oleh aturan yang deterministik.
_Avoid_: Needs attention, manual check

## Keluaran

**Tiket**:
Hasil pemrosesan satu Email Masuk: satu atau lebih Issue, data terekstrak, hasil verifikasi, dan satu Draft Balasan. Satu Email Masuk menghasilkan tepat satu Tiket.
_Avoid_: Case, kasus, ticket item

**Diarsipkan**:
Status Tiket yang seluruhnya Spam. Tidak masuk antrian tim mana pun dan tidak punya Draft Balasan, tapi tetap bisa ditemukan.
_Avoid_: Dihapus, dibuang, trash

**Draft Balasan**:
Usulan teks balasan ke pelanggan yang sesuai Kebijakan. Tidak pernah dikirim oleh sistem.
_Avoid_: Auto-reply, respon otomatis

**Kebijakan**:
Dokumen resmi perusahaan (refund, pengiriman, garansi, dll.) yang menjadi acuan isi Draft Balasan.
_Avoid_: SOP, rules, policy doc

**Aturan Terhitung**:
Angka atau syarat dari Kebijakan yang dievaluasi oleh kode (misalnya batas hari refund), dan selalu merujuk ke dokumen + pasal sumbernya.
_Avoid_: Business rule, config

**Fakta Kebijakan**:
Hasil evaluasi Aturan Terhitung terhadap satu Issue (misalnya "refund tidak memenuhi syarat, lewat 5 hari"). Draft Balasan menjelaskan fakta ini, tidak menentukannya.
_Avoid_: Keputusan, verdict

## Evaluasi

**Skenario**:
Spesifikasi terstruktur untuk membuat satu Email Masuk dummy. Ground Truth diturunkan dari Skenario ini.
_Avoid_: Test case, sample

**Ground Truth**:
Jawaban benar untuk satu Email Masuk dummy (Kategori, Tim Tujuan, data, Flag Review) yang dipakai untuk mengukur sistem.
_Avoid_: Label, expected output
