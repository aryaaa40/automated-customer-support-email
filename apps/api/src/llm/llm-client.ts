import type { Lampiran } from "../email-source/email-source";

/** Semua yang dikirim ke penyedia LLM untuk satu panggilan. */
export interface LlmPrompt {
  system: string;
  user: string;
  attachments: Lampiran[];
}

/**
 * Port ke penyedia LLM. Mengembalikan `unknown`: output model tidak tepercaya
 * dan selalu divalidasi skema oleh pemanggil.
 */
export interface LlmClient {
  extract(prompt: LlmPrompt): Promise<unknown>;
}

export const LLM_CLIENT = Symbol("LLM_CLIENT");
