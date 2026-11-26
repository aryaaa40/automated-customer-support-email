import type { LlmClient, LlmPrompt } from "./llm-client";

/**
 * Adapter LLM palsu: jawabannya ditentukan oleh pemanggil (test), dan setiap
 * prompt yang diterima dicatat supaya bisa diperiksa.
 */
export class FakeLlmClient implements LlmClient {
  readonly prompts: LlmPrompt[] = [];

  constructor(private readonly respond: (prompt: LlmPrompt) => unknown) {}

  async extract(prompt: LlmPrompt): Promise<unknown> {
    this.prompts.push(prompt);
    return this.respond(prompt);
  }
}
