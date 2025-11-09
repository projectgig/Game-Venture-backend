import { authenticateToken } from "@game/common/middleware/auth.middleware";
import { requireRole } from "@game/common/middleware/rbac.middleware";
import { loadCoins } from "@game/controllers/coin/coin.controller";
import { Router } from "express";

/**
 * @swagger
 * tags:
 *   name: Coins
 *   description: Routes for managing coins
 */

const router = Router();

/**
 * @swagger
 * /api/coin/load:
 *   post:
 *     summary: Load coins to a player account
 *     tags: [Coins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playerId:
 *                 type: string
 *                 example: "player123"
 *               amount:
 *                 type: number
 *                 example: 100
 *     responses:
 *       200:
 *         description: Coins successfully loaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 payment:
 *                   type: object
 *                 ledger:
 *                   type: object
 *                 newBalance:
 *                   type: number
 *       400:
 *         description: Invalid input or unauthorized
 */
router.post(
  "/load",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const { playerId, amount } = req.body;

      const currentUser = req.user;

      if (!currentUser)
        return res.status(401).json({ message: "Unauthorized" });

      const adminId = currentUser.id;

      if (!adminId || !playerId || !amount) {
        return res
          .status(400)
          .json({ message: "adminId, playerId, and amount are required" });
      }

      const result = await loadCoins(adminId, playerId, amount);

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
);

export const coinRoutes = router;
