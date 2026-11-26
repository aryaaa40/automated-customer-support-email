import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { config, loadEnv } from "./config";
import { DATABASE, runMigrations } from "./db/database";

async function bootstrap() {
  loadEnv();
  const app = await NestFactory.create(AppModule);
  await runMigrations(app.get(DATABASE));
  app.enableShutdownHooks();
  await app.listen(config.port());
}

void bootstrap();
