import type { TicketDetail, TicketSummary } from "@email-routing/shared";
import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from "@nestjs/common";
import { TicketsService } from "./tickets.service";

@Controller("tickets")
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(): Promise<TicketSummary[]> {
    return this.tickets.list();
  }

  @Get(":id")
  async detail(@Param("id", ParseUUIDPipe) id: string): Promise<TicketDetail> {
    const ticket = await this.tickets.findById(id);
    if (!ticket) throw new NotFoundException();
    return ticket;
  }
}
