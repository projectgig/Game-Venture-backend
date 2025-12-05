import { Router } from "express";
import { authenticateToken } from "@game/core/common/middleware/auth.middleware";
import { requireRole } from "@game/core/common/middleware/rbac.middleware";
import { COIN_ROUTES as COIN } from "@game/core/common/constrants/routes";
import { CoinController } from "@game/controllers";

/**
 * @swagger
 * tags:
 *   name: Coins
 *   description: Routes for managing coins
 */
const router = Router();
router.use(authenticateToken);

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
router.post(COIN.LOAD_COINS, requireRole("ADMIN"), async (req, res) => {
  try {
    const { amount } = req.body;
    const currentUser = req.user;

    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const adminId = currentUser.id;

    if (!adminId || !amount) {
      return res
        .status(400)
        .json({ message: "adminId and amount are required" });
    }

    const result = await CoinController.loadCoins(adminId, amount);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

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
  COIN.ASSIGN_COIN,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  CoinController.assignCoin
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
  COIN.TRANSACTIONS_HIERARCHY,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  CoinController.transactionsHistoryHierarchy
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
  COIN.GET_MY_TRANSACTIONS,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE", "PLAYER"),
  CoinController.getMyTransactions
);

export const COIN_ROUTES = router;
