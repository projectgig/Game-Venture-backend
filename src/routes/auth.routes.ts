import { Router } from "express";
import { authenticateToken } from "@game/core/common/middleware/auth.middleware";
import { requireRole } from "@game/core/common/middleware/rbac.middleware";
import { AUTH_ROUTES as AUTH } from "@game/core/common/constrants/routes";
import { AuthController } from "@game/controllers";

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
router.post(AUTH.LOGIN, AuthController.login);
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
router.post(AUTH.LOGOUT, AuthController.logout);
router.post(AUTH.REFRESH_TOKEN, AuthController.refreshToken);
router.post(AUTH.VERIFY_2FA, AuthController.verify2FA);

/**
 * Authenticated Routes
 */
router.use(authenticateToken);

router.post(AUTH.SETUP_2FA, AuthController.setup2FA);
router.post(AUTH.ENABLE_2FA, AuthController.enable2FA);
router.post(AUTH.DISABLE_2FA, AuthController.disable2FA);
router.get(AUTH.BACKUP_CODES, AuthController.getBackupCodes);

router.post(AUTH.REQUEST_RECOVERY, AuthController.requestRecovery);

// Admin-only
router.post(
  AUTH.APPROVE_RECOVERY,
  requireRole("ADMIN"),
  AuthController.approveRecovery
);

export const AUTH_ROUTES = router;
