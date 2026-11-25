# RAG ditulis sendiri di atas pgvector, tanpa LangChain

Retrieval Kebijakan (ekstraksi teks PDF, chunking per pasal, embedding, query similarity) ditulis langsung memakai OpenAI SDK, Drizzle, dan pgvector di PostgreSQL, tanpa LangChain.js. Pipeline-nya lurus dan LLM sengaja tidak diberi tool (ADR-0001), jadi kekuatan utama LangChain (agent, tool calling, chain bercabang) tidak terpakai. Yang tersisa cuma lapisan abstraksi di atas sedikit kode, dan lapisan itu menyulitkan debugging ketika recall retrieval jelek. Proyek ini juga sarana belajar, jadi setiap langkah RAG harus terlihat.

## Consequences

- Reimplementasi memakai LangChain boleh dibuat sebagai eksperimen pembanding. Hasilnya diukur dengan eval yang sama.
