import { type Extraction } from "@email-routing/shared";
import { Module } from "@nestjs/common";
import { config } from "../config";
import { FakeLlmClient } from "./fake-llm-client";
import { LLM_CLIENT } from "./llm-client";

/**
 * Jawaban adapter palsu saat dijalankan lewat CLI/API, sampai adapter OpenAI
 * dibuat di #12. Isinya sengaja generik: belum ada LLM yang membaca email.
 */
const PLACEHOLDER_EXTRACTION: Extraction = {
  issues: [
    {
      category: "pertanyaan_produk",
      urgency: "rendah",
      summary: "Extraction palsu: LLM belum tersambung",
      orderNumber: null,
      amount: null,
      date: null,
      productName: null,
    },
  ],
  sentiment: "netral",
  threat: { present: false, evidence: null },
  injectionAttempt: { present: false, evidence: null },
  ambiguous: { isAmbiguous: true, reason: "Extraction palsu: LLM belum tersambung" },
};

@Module({
  providers: [
    {
      provide: LLM_CLIENT,
      useFactory: () => {
        const provider = config.llmProvider();
        if (provider === "fake") return new FakeLlmClient(() => PLACEHOLDER_EXTRACTION);
        throw new Error(`LLM_PROVIDER tidak dikenal: ${provider}`);
      },
    },
  ],
  exports: [LLM_CLIENT],
})
export class LlmModule {}
