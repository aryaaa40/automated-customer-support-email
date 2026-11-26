import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { Pool } from "pg";
import { config } from "../config";

export type Database = NodePgDatabase;
export const DATABASE = Symbol("DATABASE");

const POOL = Symbol("POOL");

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
}

@Global()
@Module({
  providers: [
    { provide: POOL, useFactory: () => new Pool({ connectionString: config.databaseUrl() }) },
    { provide: DATABASE, inject: [POOL], useFactory: (pool: Pool) => drizzle(pool) },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
