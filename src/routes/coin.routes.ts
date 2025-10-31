import { Router, Response } from "express";
import { authenticateToken, requireAdmin, rateLimit } from "../common/middleware/auth.middleware";
import { db } from "../database/prismaClient";
import { AuthRequest } from "../common/middleware/auth.middleware";

const router = Router();

interface Company {
  id: string;
  username: string;
  points: number;
}

// Middleware stack
router.use(authenticateToken);
router.use(requireAdmin);
router.use(rateLimit(50, 900000));

// ---------------------- GET /api/coins ----------------------
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const admin = (await db.findUnique(
      "company",
      {
        where: { id: req.company?.id },
        select: {
          id: true,
          username: true,
          points: true,
        },
      },
      { ttl: 30 } // cached lookup
    )) as Company | null;

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.json({
      message: "Admin coin balance fetched successfully",
      coins: admin.points,
    });
  } catch (error) {
    console.error("Get coins error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------------- POST /api/coins ----------------------
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { username, amount } = req.body;

    if (!username || amount === undefined) {
      return res.status(400).json({ message: "Username and amount are required" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    const coinsToAdd = amount;

    // Find target company
    const company = (await db.findUnique(
      "company",
      { where: { username } },
      { ttl: 30 }
    )) as Company | null;

    if (!company) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user balance
    const updatedCompany = (await db.update(
      "company",
      {
        where: { username },
        data: { points: company.points + coinsToAdd },
      }
    )) as Company;

    return res.json({
      message: "Coins generated successfully",
      company: {
        id: updatedCompany.id,
        username: updatedCompany.username,
        points: updatedCompany.points,
      },
    });
  } catch (error) {
    console.error("Generate coin error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
