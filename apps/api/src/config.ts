import { existsSync } from "node:fs";
import path from "node:path";

/** Root repo: folder terdekat (dari cwd ke atas) yang berisi pnpm-workspace.yaml. */
export function repoRoot(): string {
  let dir = process.cwd();
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
  return dir;
}

/** Muat .env di root repo (kalau ada) tanpa menimpa variabel yang sudah diset. */
export function loadEnv(): void {
  const file = path.join(repoRoot(), ".env");
  if (existsSync(file)) process.loadEnvFile(file);
}

export const config = {
  databaseUrl: () =>
    process.env.DATABASE_URL ?? "postgres://email_routing:email_routing@localhost:5433/email_routing",
  inboxDir: () => path.resolve(repoRoot(), process.env.INBOX_DIR ?? "data/inbox"),
  /** Sumber Markdown Kebijakan dan folder PDF hasil `pnpm policies:generate`. */
  policySourceDir: () => path.resolve(repoRoot(), "data/policies/source"),
  policyPdfDir: () => path.resolve(repoRoot(), "data/policies"),
  llmProvider: () => process.env.LLM_PROVIDER ?? "fake",
  port: () => Number(process.env.PORT ?? 3000),
};
