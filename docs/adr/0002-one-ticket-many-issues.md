# Satu Email Masuk = satu Tiket berisi banyak Issue

Email yang berisi lebih dari satu masalah tidak dipecah jadi beberapa Tiket, dan juga tidak diberi satu tim utama. Hasilnya satu Tiket dengan beberapa Issue. Tiap Issue punya satu Kategori dan diarahkan ke Tim Tujuan-nya sendiri. Tiketnya tetap punya satu Draft Balasan, satu Flag Review, dan satu prioritas.

Alasannya: kalau pakai "satu tim utama", tim lain tidak pernah melihat masalahnya. Itu persis penyebab email bolak-balik antar tim. Kalau dipecah jadi beberapa Tiket, pelanggan menerima beberapa balasan terpisah yang bisa saling bertentangan.

## Consequences

- Akurasi routing diukur per email dengan membandingkan himpunan Tim Tujuan secara persis (exact set match) terhadap Ground Truth.
- Flag Review dan prioritas ada di level Tiket. Satu Issue berisiko sudah cukup untuk menahan seluruh Tiket.
