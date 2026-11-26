import { Module } from "@nestjs/common";
import { DatabaseModule } from "./db/database";
import { config } from "./config";
import { EMAIL_SOURCE } from "./email-source/email-source";
import { FileSource } from "./email-source/file-source";
import { Extractor } from "./extraction/extractor";
import { IngestionService } from "./ingestion/ingestion.service";
import { LlmModule } from "./llm/llm.module";
import { OrdersService } from "./orders/orders.service";
import { TicketsController } from "./tickets/tickets.controller";
import { TicketsService } from "./tickets/tickets.service";

@Module({
  imports: [DatabaseModule, LlmModule],
  controllers: [TicketsController],
  providers: [
    { provide: EMAIL_SOURCE, useFactory: () => new FileSource(config.inboxDir()) },
    Extractor,
    IngestionService,
    OrdersService,
    TicketsService,
  ],
})
export class AppModule {}
