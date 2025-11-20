import { authenticateToken } from "@game/common/middleware/auth.middleware";
import { requireRole } from "@game/common/middleware/rbac.middleware";
import {
  assignCoin,
  getMyTransactions,
  loadCoins,
  transactionsHistoryHierarchy,
} from "@game/controllers/coin/coin.controller";
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
 *     summary: Load coins to a admin account
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
      const { amount } = req.body;

      const currentUser = req.user;

      if (!currentUser)
        return res.status(401).json({ message: "Unauthorized" });

      const adminId = currentUser.id;

      if (!adminId || !amount) {
        return res
          .status(400)
          .json({ message: "adminId and amount are required" });
      }

      const result = await loadCoins(adminId, amount);

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/coin/assign-coin:
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
 *               targetId:
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
  "/assign-coin",
  authenticateToken,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  assignCoin
);

router.get(
  "/transactions-hierarchy",
  authenticateToken,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  transactionsHistoryHierarchy
);
router.get(
  "/my-transactions",
  authenticateToken,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE", "PLAYER"),
  getMyTransactions
);

export const coinRoutes = router;
