import express from "express";
import { authRoutes } from "./auth.routes";
import { companyRoutes } from "./company.route";

/**
 * @swagger
 * tags:
 *   name: Testing
 *   description: Testing routes
 */

class MainRoutes {
  public router = express.Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    /**
     * @swagger
     * /api/testing:
     *   get:
     *     summary: Test API route
     *     tags: [Testing]
     *     responses:
     *       200:
     *         description: Returns a success message
     *         content:
     *           text/plain:
     *             schema:
     *               type: string
     *               example: Testing route is working!
     */
    this.router.get("/testing", (_, res) => {
      res.send("Testing route is working!");
    });

    this.router.use("/auth", authRoutes);
    this.router.use("/company", companyRoutes);
  }
}

export const mainRoutes = new MainRoutes().router;
