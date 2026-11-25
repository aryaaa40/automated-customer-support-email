# Aturan Kebijakan yang bisa dihitung dievaluasi kode, bukan dibaca LLM dari hasil RAG

Angka-angka dalam Kebijakan yang menentukan hasil (batas hari refund, masa garansi per kategori produk, ambang nominal review) disalin ke satu file konfigurasi Aturan Terhitung. Tiap angka mencantumkan dokumen dan pasal sumbernya. Kode mengevaluasi aturan itu menjadi Fakta Kebijakan, lalu Draft Balasan menerima Fakta Kebijakan dan potongan Kebijakan hasil retrieval sekaligus. LLM hanya menjelaskan, tidak menentukan kelayakan.

Konsekuensinya angka yang sama tercatat di dua tempat (PDF dan konfigurasi), dan itu disengaja. Kalau kelayakan diserahkan ke LLM yang membaca potongan RAG, kesalahan retrieval atau injection bisa menghasilkan janji refund yang melanggar Kebijakan, dan masalah awal "balasan bertentangan dengan kebijakan" justru terulang. Rujukan pasal di konfigurasi membuat ketidaksinkronan mudah diperiksa.
