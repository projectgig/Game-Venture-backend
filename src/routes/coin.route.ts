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

/**
 * @swagger
 * /api/coin/transactions-hierarchy:
 *   get:
 *     summary: Get transactions hierarchy
 *     tags: [Coins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions hierarchy fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Transactions hierarchy fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "clz8p4xy1000a3k6g6jv5n2p9"
 *                           amount:
 *                             type: number
 *                             example: 100
 *                           type:
 *                             type: string
 *                             example: "LOAD"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2023-01-01T00:00:00Z"
 *       400:
 *         description: Invalid input or unauthorized
 */
router.get(
  "/transactions-hierarchy",
  authenticateToken,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  transactionsHistoryHierarchy
);

/**
 * @swagger
 * /api/coin/my-transactions:
 *   get:
 *     summary: Get transactions hierarchy
 *     tags: [Coins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions hierarchy fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Transactions hierarchy fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "clz8p4xy1000a3k6g6jv5n2p9"
 *                           amount:
 *                             type: number
 *                             example: 100
 *                           type:
 *                             type: string
 *                             example: "LOAD"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2023-01-01T00:00:00Z"
 *       400:
 *         description: Invalid input or unauthorized
 */
router.get(
  "/my-transactions",
  authenticateToken,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE", "PLAYER"),
  getMyTransactions
);

export const coinRoutes = router;
