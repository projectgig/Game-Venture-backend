import express from "express";
import { authRoutes } from "./auth.routes";
import { companyRoutes } from "./company.route";
import { coinRoutes } from "./coin.route";

class MainRoutes {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use("/auth", authRoutes);
    this.router.use("/company", companyRoutes);
    this.router.use("/coin", coinRoutes);
  }
}

export const mainRoutes = new MainRoutes().router;
