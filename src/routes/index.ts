import express from "express";
import { authRoutes } from "./auth.routes";
import { companyRoutes } from "./company.route";

class MainRoutes {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use("/auth", authRoutes);
    this.router.use("/company", companyRoutes);
  }
}

export const mainRoutes = new MainRoutes().router;
