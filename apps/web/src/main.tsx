import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { TicketDetailPage } from "./TicketDetailPage";
import { TicketsPage } from "./TicketsPage";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TicketsPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
