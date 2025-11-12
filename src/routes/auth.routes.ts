import { Router } from "express";
import {
  approveRecovery,
  disable2FA,
  enable2FA,
  getBackupCodes,
  login,
  logout,
  refreshToken,
  requestRecovery,
  setup2FA,
  verify2FA,
} from "../controllers/auth.controller";
import { authenticateToken } from "@game/common/middleware/auth.middleware";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication routes
 */

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", logout);

/**
 * @swagger
 * /api/auth/refreshToken:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access token refreshed
 *       401:
 *         description: Unauthorized
 */
router.post("/refreshToken", refreshToken);
router.post("/2fa/verify", verify2FA);

router.use(authenticateToken);

router.post("/2fa/setup", setup2FA);
router.post("/2fa/enable", enable2FA);
router.post("/2fa/disable", disable2FA);
router.get("/2fa/backup-codes", getBackupCodes);
router.post("/2fa/recovery/request", requestRecovery);

// Admin route
router.post("/2fa/recovery/approve/:recoveryId", approveRecovery);

export const authRoutes = router;
