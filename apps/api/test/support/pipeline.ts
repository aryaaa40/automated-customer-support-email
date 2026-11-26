import { type LoggerService } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { AppModule } from "../../src/app.module";
import { DATABASE, type Database } from "../../src/db/database";
import { EMAIL_SOURCE } from "../../src/email-source/email-source";
import { FileSource } from "../../src/email-source/file-source";
import { IngestionService } from "../../src/ingestion/ingestion.service";
import { FakeLlmClient } from "../../src/llm/fake-llm-client";
import { LLM_CLIENT } from "../../src/llm/llm-client";
import { TicketsService } from "../../src/tickets/tickets.service";
import { TEST_DATABASE_URL } from "../global-setup";

/** Logger yang menyimpan semua baris log supaya test bisa memeriksanya. */
export class CapturingLogger implements LoggerService {
  readonly lines: string[] = [];
  private record = (...args: unknown[]) => {
    this.lines.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  log = this.record;
  error = this.record;
  warn = this.record;
  debug = this.record;
  verbose = this.record;
}

/**
 * Seam 1: pipeline lengkap dengan database test asli, inbox folder sementara,
 * dan adapter LLM palsu. Test hanya memakai processInbox() dan TicketsService.
 */
export async function createPipeline(opts: { inboxDir: string; llm: FakeLlmClient }) {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  const db: Database = drizzle(pool);
  await db.execute(sql`TRUNCATE incoming_emails CASCADE`);

  const logger = new CapturingLogger();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE)
    .useValue(db)
    .overrideProvider(EMAIL_SOURCE)
    .useValue(new FileSource(opts.inboxDir))
    .overrideProvider(LLM_CLIENT)
    .useValue(opts.llm)
    .setLogger(logger)
    .compile();
  await moduleRef.init();

  return {
    logger,
    processInbox: () => moduleRef.get(IngestionService).processInbox(),
    tickets: moduleRef.get(TicketsService),
    async close() {
      await moduleRef.close();
      await pool.end();
    },
  };
}
