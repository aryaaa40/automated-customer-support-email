import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "./config";
import { DATABASE, runMigrations } from "./db/database";
import { IngestionService } from "./ingestion/ingestion.service";
import { writeSeed } from "./orders/seed";
import { buildSeedData } from "./orders/seed-data";

/** CLI lewat NestJS standalone application context: `node dist/cli.js <perintah>`. */
const commands: Record<string, (app: Awaited<ReturnType<typeof createContext>>) => Promise<void>> = {
  // Migrasi sudah dijalankan main() sebelum setiap perintah; perintah ini hanya itu.
  migrate: async () => {},
  seed: async (app) => {
    const data = buildSeedData();
    await writeSeed(app.get(DATABASE), data);
    Logger.log(
      `Seed selesai: ${data.customers.length} pelanggan, ${data.products.length} produk, ${data.orders.length} order`,
    );
  },
  "process-inbox": async (app) => {
    const result = await app.get(IngestionService).processInbox();
    if (result.failed > 0) process.exitCode = 1;
  },
};

function createContext() {
  return NestFactory.createApplicationContext(AppModule, { logger: ["log", "warn", "error"] });
}

async function main() {
  loadEnv();
  const name = process.argv[2] ?? "";
  const command = commands[name];
  if (!command) {
    Logger.error(`Perintah tidak dikenal: "${name}". Pilihan: ${Object.keys(commands).join(", ")}`);
    process.exitCode = 1;
    return;
  }
  const app = await createContext();
  try {
    await runMigrations(app.get(DATABASE));
    await command(app);
  } finally {
    await app.close();
  }
}

void main();
