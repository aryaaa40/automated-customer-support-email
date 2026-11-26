import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { runMigrations } from "../src/db/database";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://email_routing:email_routing@localhost:5433/email_routing_test";

/** Migrasi database test sekali sebelum seluruh test berjalan. */
export default async function setup() {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  try {
    await runMigrations(drizzle(pool));
  } finally {
    await pool.end();
  }
}
