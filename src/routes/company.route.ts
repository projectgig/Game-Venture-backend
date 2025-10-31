import { Router } from "express";
import {
  createUser,
  getDownline,
  getUser,
  updateUser,
  changePassword,
  toggleUserStatus,
  getDownlineDashboard,
} from "../controllers/company.controller";
import { authenticateToken } from "../common/middleware/auth.middleware";
import {
  requireRole,
  requireCreatorOfParam,
} from "../common/middleware/rbac.middleware";

/**
 * @swagger
 * tags:
 *   name: Company
 *   description: User management and downline operations
 */

const router = Router();

/**
 * @swagger
 * /api/company/create:
 *   post:
 *     summary: Create a new user
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - role
 *               - points
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [ADMIN, DISTRIBUTOR, SUB_DISTRIBUTOR, STORE, PLAYER]
 *               points:
 *                 type: number
 *                 example: 1000
 *               contactNumber:
 *                 type: string
 *                 example: "+9779812345678"
 *               remarks:
 *                 type: string
 *                 example: "New store user created by admin"
 *               rechargePerm:
 *                 type: boolean
 *                 example: true
 *               withdrawPerm:
 *                 type: boolean
 *                 example: false
 *               agentProtect:
 *                 type: boolean
 *                 example: false
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               parentId:
 *                 type: string
 *                 example: "clx1d2abc0000xyt12z34"
 *               status:
 *                 type: string
 *                 example: "ACTIVE"
 *               lastLoggedIn:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-31T08:30:00Z"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request or username exists
 *       403:
 *         description: Cannot create user with equal or higher role
 *       401:
 *         description: Unauthorized
 */

router.post(
  "/create",
  authenticateToken,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  createUser
);

/**
 * @swagger
 * /api/company/downline:
 *   get:
 *     summary: Get downline users
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Downline fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/downline",
  authenticateToken,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  getDownline
);

/**
 * @swagger
 * /api/company/downline/dashboard:
 *   get:
 *     summary: Get downline dashboard statistics
 *     description: Retrieve comprehensive analytics and statistics for all users in the downline hierarchy including registrations, activity, points, and role breakdowns
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalDownline:
 *                           type: integer
 *                           example: 111
 *                         totalPlayers:
 *                           type: integer
 *                           example: 100
 *                         totalAgents:
 *                           type: integer
 *                           example: 11
 *                         activeUsers:
 *                           type: integer
 *                           example: 95
 *                         inactiveUsers:
 *                           type: integer
 *                           example: 16
 *                         usersWithRechargePermission:
 *                           type: integer
 *                           example: 50
 *                         usersWithWithdrawPermission:
 *                           type: integer
 *                           example: 45
 *                         protectedAgents:
 *                           type: integer
 *                           example: 8
 *                     registrations:
 *                       type: object
 *                       properties:
 *                         today:
 *                           type: integer
 *                           example: 5
 *                         yesterday:
 *                           type: integer
 *                           example: 3
 *                         last7Days:
 *                           type: integer
 *                           example: 20
 *                         last30Days:
 *                           type: integer
 *                           example: 45
 *                         thisMonth:
 *                           type: integer
 *                           example: 35
 *                     activity:
 *                       type: object
 *                       properties:
 *                         activeToday:
 *                           type: integer
 *                           example: 50
 *                         activeYesterday:
 *                           type: integer
 *                           example: 48
 *                         activeLast7Days:
 *                           type: integer
 *                           example: 80
 *                         activeLast30Days:
 *                           type: integer
 *                           example: 95
 *                         neverLoggedIn:
 *                           type: integer
 *                           example: 10
 *                     userActivity:
 *                       type: object
 *                       properties:
 *                         totalActivities:
 *                           type: integer
 *                           example: 5000
 *                         activitiesToday:
 *                           type: integer
 *                           example: 150
 *                         activitiesYesterday:
 *                           type: integer
 *                           example: 120
 *                         activitiesLast7Days:
 *                           type: integer
 *                           example: 800
 *                         activitiesLast30Days:
 *                           type: integer
 *                           example: 3000
 *                         activitiesThisMonth:
 *                           type: integer
 *                           example: 2500
 *                         uniqueDevicesToday:
 *                           type: integer
 *                           example: 45
 *                         uniqueIPsToday:
 *                           type: integer
 *                           example: 42
 *                     points:
 *                       type: object
 *                       properties:
 *                         totalPoints:
 *                           type: integer
 *                           example: 125000
 *                         averagePoints:
 *                           type: integer
 *                           example: 1126
 *                         maxPoints:
 *                           type: integer
 *                           example: 50000
 *                         minPoints:
 *                           type: integer
 *                           example: 0
 *                         usersWithPoints:
 *                           type: integer
 *                           example: 85
 *                     roleBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           role:
 *                             type: string
 *                             example: "PLAYER"
 *                           count:
 *                             type: integer
 *                             example: 100
 *                           percentage:
 *                             type: string
 *                             example: "90.09"
 *                     statusBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             example: "ACTIVE"
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           count:
 *                             type: integer
 *                             example: 95
 *                           percentage:
 *                             type: string
 *                             example: "85.59"
 *                 message:
 *                   type: string
 *                   example: "Dashboard data fetched successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get(
  "/downline/dashboard",
  authenticateToken,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  getDownlineDashboard
);

/**
 * @swagger
 * /api/company/{id}:
 *   get:
 *     summary: Get single user by ID
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 123
 *     responses:
 *       200:
 *         description: User fetched successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", authenticateToken, requireCreatorOfParam("id"), getUser);

/**
 * @swagger
 * /api/company/{id}:
 *   patch:
 *     summary: Update user info (must be creator)
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to update
 *         schema:
 *           type: string
 *           example: "clx1d2abc0000xyt12z34"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe_updated
 *               email:
 *                 type: string
 *                 example: johndoe_updated@example.com
 *               contactNumber:
 *                 type: string
 *                 example: "+9779812345678"
 *               remarks:
 *                 type: string
 *                 example: "Updated store user info"
 *               rechargePerm:
 *                 type: boolean
 *                 example: true
 *               withdrawPerm:
 *                 type: boolean
 *                 example: false
 *               agentProtect:
 *                 type: boolean
 *                 example: false
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               status:
 *                 type: string
 *                 example: "ACTIVE"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *                 user:
 *                   type: object
 *                   description: The updated user object
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/:id",
  authenticateToken,
  requireCreatorOfParam("id"),
  updateUser
);

/**
 * @swagger
 * /api/company/{id}/toggle:
 *   patch:
 *     summary: Toggle user status (active/inactive)
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to toggle status
 *         schema:
 *           type: string
 *           example: "clx1d2abc0000xyt12z34"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User activated successfully"
 *                 isActive:
 *                   type: boolean
 *                   example: true
 *       403:
 *         description: Access denied or cannot deactivate admin
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:id/toggle",
  authenticateToken,
  requireCreatorOfParam("id"),
  toggleUserStatus
);

/**
 * @swagger
 * /api/company/change-password:
 *   post:
 *     summary: Change password for current user
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: oldpass123
 *               newPassword:
 *                 type: string
 *                 example: newpass123
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Missing fields
 *       401:
 *         description: Unauthorized or invalid old password
 */
router.post("/change-password", authenticateToken, changePassword);

export const companyRoutes = router;
