---
code: KBJ-04
title: Kebijakan Pembayaran & Verifikasi Transfer
version: 2.0
status: aktif
effectiveDate: 2026-06-01
owner: Divisi Finance
---

## BAB 1 Ketentuan Umum

### Pasal 1.1 Ruang Lingkup

Kebijakan ini mengatur metode pembayaran, batas waktu pembayaran, verifikasi bukti transfer, serta penanganan masalah pembayaran seperti dana terpotong tetapi pesanan gagal, tagihan ganda, dan nominal transfer yang tidak sesuai. Penanganan masalah pembayaran menjadi tanggung jawab Tim Finance.

### Pasal 1.2 Metode Pembayaran

Pelanggan dapat membayar dengan metode berikut.

| Metode | Batas Waktu Pembayaran | Konfirmasi Pembayaran |
|---|---|---|
| Transfer Bank | 24 jam sejak checkout | Manual oleh Tim Finance, paling lambat 1x24 jam hari kerja |
| Virtual Account | 24 jam sejak checkout | Otomatis, paling lambat 15 menit |
| Kartu Kredit | Saat checkout | Otomatis, langsung |
| E-Wallet | 15 menit sejak checkout | Otomatis, langsung |

## BAB 2 Status Pembayaran

### Pasal 2.1 Arti Status Pembayaran

Status pembayaran yang tercatat di sistem order memiliki arti sebagai berikut.

| Status | Arti |
|---|---|
| Menunggu | Pesanan sudah dibuat tetapi pembayaran belum diterima atau belum diverifikasi. |
| Lunas | Pembayaran sudah diterima penuh dan terverifikasi. |
| Gagal | Pembayaran ditolak, kedaluwarsa, atau dibatalkan. |
| Dikembalikan | Dana sudah dikembalikan kepada pelanggan melalui proses refund. |

### Pasal 2.2 Pembatalan Otomatis

Pesanan berstatus menunggu yang tidak dibayar sampai batas waktu pada Pasal 1.2 dibatalkan otomatis oleh sistem dan stok dikembalikan. Pelanggan yang tetap mentransfer setelah pesanan dibatalkan otomatis berhak atas pengembalian dana penuh ke rekening pengirim dalam 3-5 hari kerja setelah transfer diverifikasi.

## BAB 3 Verifikasi Transfer Manual

### Pasal 3.1 Bukti Transfer

Untuk metode Transfer Bank, pelanggan mengirim bukti transfer berupa foto atau tangkapan layar. Bukti transfer dianggap sah jika memuat informasi berikut:

- Tanggal dan jam transaksi.
- Nominal yang ditransfer.
- Nama bank dan nama pemilik rekening pengirim.
- Nomor referensi atau nomor transaksi dari bank.

Tim Finance mencocokkan bukti transfer dengan mutasi rekening perusahaan. Bukti transfer saja tidak cukup untuk mengubah status menjadi lunas sebelum dana tercatat di mutasi.

### Pasal 3.2 Nominal Transfer Tidak Sesuai

Jika nominal transfer kurang dari total tagihan, pesanan ditahan dan pelanggan diminta mentransfer kekurangannya dalam 24 jam. Jika kekurangan tidak dibayar, pesanan dibatalkan dan dana yang sudah masuk dikembalikan penuh. Jika nominal transfer lebih besar dari total tagihan, kelebihannya dikembalikan ke rekening pengirim dalam 3-5 hari kerja setelah diverifikasi.

### Pasal 3.3 Waktu Verifikasi

Transfer yang masuk pada hari kerja sebelum pukul 15.00 WIB diverifikasi pada hari yang sama. Transfer setelah pukul 15.00 WIB, atau pada hari Sabtu, Minggu, dan hari libur nasional, diverifikasi pada hari kerja berikutnya.

## BAB 4 Masalah Pembayaran

### Pasal 4.1 Dana Terpotong tetapi Pembayaran Gagal

Jika saldo pelanggan terpotong tetapi status pembayaran gagal, dana umumnya dikembalikan otomatis oleh bank atau penyedia pembayaran dalam 1-3 hari kerja. Jika setelah 3 hari kerja dana belum kembali, Tim Finance membuka investigasi dengan penyedia pembayaran dan memberi kabar kepada pelanggan paling lambat 2 hari kerja kemudian.

### Pasal 4.2 Tagihan Ganda

Tagihan ganda terjadi jika dana pelanggan terpotong lebih dari satu kali untuk pesanan yang sama. Tagihan ganda ditangani sebagai prioritas tertinggi oleh Tim Finance. Setelah potongan ganda terverifikasi pada mutasi atau laporan penyedia pembayaran, kelebihan dana dikembalikan paling lambat 3 (tiga) hari kerja melalui metode pembayaran yang sama.

Pengajuan tagihan ganda tidak terikat batas waktu refund 7 hari pada Kebijakan Refund & Pengembalian, tetapi sebaiknya dilaporkan paling lambat 30 hari kalender sejak tanggal transaksi agar dapat ditelusuri penyedia pembayaran.

### Pasal 4.3 Pembayaran Kartu Kredit Ditolak

Penolakan transaksi kartu kredit diputuskan oleh bank penerbit kartu. Staf Customer Service tidak dapat mengetahui alasan penolakan dan menyarankan pelanggan menghubungi bank penerbit atau memakai metode pembayaran lain.

## BAB 5 Verifikasi Manual dan Keamanan Pembayaran

### Pasal 5.1 Ambang Verifikasi Manual

Setiap pengajuan refund, klaim, atau keluhan pembayaran dengan nominal di atas Rp1.000.000 (satu juta rupiah) wajib diperiksa oleh Staf CS sebelum diteruskan ke tim terkait. Ketentuan ini berlaku tanpa pengecualian, termasuk untuk pelanggan lama dan pesanan yang datanya terlihat lengkap.

### Pasal 5.2 Data Pembayaran Sensitif

Staf Customer Service tidak pernah meminta nomor kartu lengkap, kode CVV, PIN, kata sandi, atau kode OTP dalam bentuk apa pun. Dalam komunikasi internal dan balasan kepada pelanggan, nomor kartu dan nomor rekening ditulis tersamar, misalnya hanya empat digit terakhir.

> Pengecualian: pengembalian dana ke rekening atas nama pihak lain hanya dapat dilakukan dengan surat kuasa bermeterai dari pemilik akun dan persetujuan tertulis Tim Finance.

## BAB 6 Invoice dan Bukti Pembayaran

### Pasal 6.1 Invoice Resmi

Invoice resmi dikirim otomatis ke email pemilik order setelah status pembayaran berubah menjadi lunas. Invoice memuat nomor order, tanggal pemesanan, nama dan alamat pemilik order, daftar produk beserta jumlah dan harga, ongkos kirim, potongan voucher, total tagihan, serta metode pembayaran.

Nomor order pada invoice berformat ORD- diikuti empat digit angka, misalnya ORD-1042. Nomor ini dipakai sebagai rujukan utama dalam setiap komunikasi dengan Customer Service.

### Pasal 6.2 Perbedaan Data antara Invoice dan Keterangan Pelanggan

Jika nominal atau nomor order yang disebut pelanggan di email berbeda dengan yang tertera pada invoice atau bukti transfer yang dilampirkan, Staf CS tidak memilih salah satunya sendiri. Perbedaan tersebut dicatat dan dikonfirmasi ulang kepada pelanggan, dan data yang dipakai untuk verifikasi adalah data yang tercatat di sistem order.

### Pasal 6.3 Permintaan Salinan Invoice

Salinan invoice dapat diminta melalui email Customer Service dan hanya dikirim ke alamat email pemilik order. Permintaan perubahan nama atau alamat pada invoice yang sudah terbit diproses paling lambat 2 (dua) hari kerja dan hanya untuk pesanan dalam 30 hari kalender terakhir.
