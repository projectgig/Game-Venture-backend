import express from "express";
import { AUTH_ROUTES } from "./auth.routes";
import { COMPANY_ROUTE } from "./company.route";
import { COIN_ROUTES } from "./coin.route";
import { SUPPORT_TICKET_ROUTES } from "./support-ticket.route";

class MainRoutes {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use("/auth", AUTH_ROUTES);
    this.router.use("/company", COMPANY_ROUTE);
    this.router.use("/coin", COIN_ROUTES);
    this.router.use("/support-tickets", SUPPORT_TICKET_ROUTES);
  }
}

export const mainRoutes = new MainRoutes().router;
