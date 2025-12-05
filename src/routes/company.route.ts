import { Router } from "express";
import {
  requireCreatorOfParam,
  requireRole,
} from "@game/core/common/middleware/rbac.middleware";
import { authenticateToken } from "@game/core/common/middleware/auth.middleware";
import { CompanyAnalysis, CompanyController } from "@game/controllers";
import { COMPANY_ROUTES } from "@game/core/common/constrants/routes";

const Company = {
  ...CompanyController,
  ...CompanyAnalysis,
};

/**
 * @swagger
 * tags:
 *   name: Company
 *   description: User management and downline operations
 */
const router = Router();
router.use(authenticateToken);

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
  COMPANY_ROUTES.createUser,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  Company.createUser
);

router.delete(
  COMPANY_ROUTES.deletedUser,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  Company.deletedUser
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
  COMPANY_ROUTES.getDownline,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  Company.getDownline
);

/**
 * @swagger
 * /api/company/downline/hierarchy/{parentId}:
 *   get:
 *     summary: Get downline users by parent ID
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *         example: "clz8p4xy1000a3k6g6jv5n2p9"
 *     responses:
 *       200:
 *         description: Downline users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Downline users fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DownlineTree'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  COMPANY_ROUTES.getUsersByParentId,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  Company.getUsersByParentId
);

/**
 * @swagger
 * /api/company/{id}:
 *   get:
 *     summary: Get single company user by ID
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clz8p4xy1000a3k6g6jv5n2p9"
 *     responses:
 *       200:
 *         description: Company user fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Company user fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "clz8p4xy1000a3k6g6jv5n2p9"
 *                     username:
 *                       type: string
 *                       example: "demo_company"
 *                     email:
 *                       type: string
 *                       example: "demo@company.com"
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *                     role:
 *                       type: string
 *                       example: "ADMIN"
 *                     points:
 *                       type: integer
 *                       example: 1500
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     contactNumber:
 *                       type: string
 *                       example: "+9779812345678"
 *                     parent:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         username:
 *                           type: string
 *                           example: "main_admin"
 *                         role:
 *                           type: string
 *                           example: "SUPER_ADMIN"
 *                         contactNumber:
 *                           type: string
 *                           example: "+9779800000000"
 *                         email:
 *                           type: string
 *                           example: "admin@maincompany.com"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-15T10:30:00.000Z"
 *                     lastLoggedIn:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-09T08:15:00.000Z"
 *                     remarks:
 *                       type: string
 *                       nullable: true
 *                       example: "Top-performing partner company"
 *       403:
 *         description: Access denied
 *       404:
 *         description: Company user not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", requireCreatorOfParam("id"), Company.getUser);

/**
 * @swagger
 * /api/company/me/profile:
 *   get:
 *     summary: Get current user info
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company user fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Company user fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "clz8p4xy1000a3k6g6jv5n2p9"
 *                     username:
 *                       type: string
 *                       example: "demo_company"
 *                     email:
 *                       type: string
 *                       example: "demo@company.com"
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *                     role:
 *                       type: string
 *                       example: "ADMIN"
 *                     points:
 *                       type: integer
 *                       example: 1500
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     contactNumber:
 *                       type: string
 *                       example: "+9779812345678"
 *                     parent:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         username:
 *                           type: string
 *                           example: "main_admin"
 *                         role:
 *                           type: string
 *                           example: "SUPER_ADMIN"
 *                         contactNumber:
 *                           type: string
 *                           example: "+9779800000000"
 *                         email:
 *                           type: string
 *                           example: "admin@maincompany.com"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-15T10:30:00.000Z"
 *                     lastLoggedIn:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-09T08:15:00.000Z"
 *                     remarks:
 *                       type: string
 *                       nullable: true
 *                       example: "Top-performing partner company"
 *       403:
 *         description: Access denied
 *       404:
 *         description: Company user not found
 *       401:
 *         description: Unauthorized
 */
router.get(COMPANY_ROUTES.getMe, Company.getMe);

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
router.patch("/:id", requireCreatorOfParam("id"), Company.updateUser);

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
  COMPANY_ROUTES.toggleUserStatus,
  requireCreatorOfParam("id"),
  Company.toggleUserStatus
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
router.post(COMPANY_ROUTES.changePassword, Company.changePassword);

/**
 * @swagger
 * /api/company/profile/update:
 *   patch:
 *     summary: Update user profile
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
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
 *               contactNumber:
 *                 type: string
 *                 example: "+9779812345678"
 *               email:
 *                 type: string
 *                 example: "johndoe_updated@me.com"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 user:
 *                   type: object
 *                   description: The updated user object
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.patch(COMPANY_ROUTES.updateUserProfile, Company.updateUserProfile);

/**
 * @swagger
 * /api/company/downline/dashboard:
 *   get:
 *     summary: Get downline dashboard statistics
 *     description: Retrieve comprehensive analytics for the user's downline, including overview, hierarchy, financial, game, activity, and other metrics. Data is filtered by role hierarchy, ensuring only lower-level roles are included.
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering data (e.g., '2025-01-01T00:00:00Z')
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering data (e.g., '2025-12-31T23:59:59Z')
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, DISTRIBUTOR, SUB_DISTRIBUTOR, STORE, PLAYER]
 *         description: Filter by role (must be lower than the user's role)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, BLOCK]
 *         description: Filter by user status
 *       - in: query
 *         name: gameType
 *         schema:
 *           type: string
 *         description: Filter by game type
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Predefined date range for filtering (e.g., '7d' for last 7 days)
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
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-01T00:00:00Z"
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-31T23:59:59Z"
 *                         label:
 *                           type: string
 *                           example: "30d"
 *                     currentUser:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "user123"
 *                         username:
 *                           type: string
 *                           example: "admin_user"
 *                         role:
 *                           type: string
 *                           enum: [ADMIN, DISTRIBUTOR, SUB_DISTRIBUTOR, STORE, PLAYER]
 *                           example: "ADMIN"
 *                         points:
 *                           type: number
 *                           example: 1000
 *                         status:
 *                           type: string
 *                           enum: [ACTIVE, BLOCK]
 *                           example: "ACTIVE"
 *                     overview:
 *                       type: object
 *                       properties:Horton:
 *                         properties:
 *                           totalDownline:
 *                             type: integer
 *                             example: 100
 *                           activeUsers:
 *                             type: integer
 *                             example: 80
 *                           inactiveUsers:
 *                             type: integer
 *                             example: 20
 *                           totalBalance:
 *                             type: number
 *                             example: 50000
 *                           totalBets:
 *                             type: object
 *                             properties:
 *                               amount:
 *                                 type: number
 *                                 example: 100000
 *                               count:
 *                                 type: integer
 *                                 example: 500
 *                           totalWins:
 *                             type: object
 *                             properties:
 *                               amount:
 *                                 type: number
 *                                 example: 80000
 *                               count:
 *                                 type: integer
 *                                 example: 300
 *                           netRevenue:
 *                             type: number
 *                             example: 20000
 *                           totalCommissions:
 *                             type: number
 *                             example: 5000
 *                           newUsers:
 *                             type: integer
 *                             example: 10
 *                           houseEdge:
 *                             type: string
 *                             example: "20.00"
 *                     hierarchy:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           role:
 *                             type: string
 *                             example: "PLAYER"
 *                           count:
 *                             type: integer
 *                             example: 50
 *                           totalBalance:
 *                             type: number
 *                             example: 25000
 *                           totalChildren:
 *                             type: integer
 *                             example: 10
 *                           users:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   example: "user456"
 *                                 username:
 *                                   type: string
 *                                   example: "player1"
 *                                 status:
 *                                   type: string
 *                                   example: "ACTIVE"
 *                                 balance:
 *                                   type: number
 *                                   example: 500
 *                                 childrenCount:
 *                                   type: integer
 *                                   example: 0
 *                                 createdAt:
 *                                   type: string
 *                                   format: date-time
 *                                   example: "2025-01-01T00:00:00Z"
 *                     financial:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: object
 *                           additionalProperties:
 *                             type: object
 *                             properties:
 *                               total:
 *                                 type: number
 *                                 example: 10000
 *                               count:
 *                                 type: integer
 *                                 example: 50
 *                         recentTransactions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "trans123"
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               role:
 *                                 type: string
 *                                 example: "PLAYER"
 *                               type:
 *                                 type: string
 *                                 example: "RECHARGE"
 *                               amount:
 *                                 type: number
 *                                 example: 100
 *                               remark:
 *                                 type: string
 *                                 example: "Deposit"
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                         adjustments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "adj123"
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               amount:
 *                                 type: number
 *                                 example: 50
 *                               remark:
 *                                 type: string
 *                                 example: "Bonus"
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                     games:
 *                       type: object
 *                       properties:
 *                         byGameType:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               gameType:
 *                                 type: string
 *                                 example: "SLOTS"
 *                               totalGames:
 *                                 type: integer
 *                                 example: 100
 *                               totalBets:
 *                                 type: number
 *                                 example: 10000
 *                               totalWins:
 *                                 type: number
 *                                 example: 8000
 *                               netRevenue:
 *                                 type: number
 *                                 example: 2000
 *                         byResult:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               result:
 *                                 type: string
 *                                 example: "WIN"
 *                               count:
 *                                 type: integer
 *                                 example: 50
 *                               totalBets:
 *                                 type: number
 *                                 example: 5000
 *                               totalWins:
 *                                 type: number
 *                                 example: 4000
 *                         recentGames:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "game123"
 *                               gameType:
 *                                 type: string
 *                                 example: "SLOTS"
 *                               player:
 *                                 type: string
 *                                 example: "player1"
 *                               playerRole:
 *                                 type: string
 *                                 example: "PLAYER"
 *                               store:
 *                                 type: string
 *                                 example: "store1"
 *                               betAmount:
 *                                 type: number
 *                                 example: 100
 *                               winAmount:
 *                                 type: number
 *                                 example: 200
 *                               result:
 *                                 type: string
 *                                 example: "WIN"
 *                               playedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                     activity:
 *                       type: object
 *                       properties:
 *                         totalActivities:
 *                           type: integer
 *                           example: 1000
 *                         userActivities:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               companyId:
 *                                 type: string
 *                                 example: "user456"
 *                               activityCount:
 *                                 type: integer
 *                                 example: 50
 *                         deviceBreakdown:
 *                           type: object
 *                           additionalProperties:
 *                             type: integer
 *                             example: 100
 *                         locationBreakdown:
 *                           type: object
 *                           additionalProperties:
 *                             type: integer
 *                             example: 50
 *                     topPerformers:
 *                       type: object
 *                       properties:
 *                         topByBets:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               companyId:
 *                                 type: string
 *                                 example: "user456"
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               role:
 *                                 type: string
 *                                 example: "PLAYER"
 *                               _sum:
 *                                 type: object
 *                                 properties:
 *                                   amount:
 *                                     type: number
 *                                     example: 10000
 *                         topByWins:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               companyId:
 *                                 type: string
 *                                 example: "user456"
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               role:
 *                                 type: string
 *                                 example: "PLAYER"
 *                               _sum:
 *                                 type: object
 *                                 properties:
 *                                   amount:
 *                                     type: number
 *                                     example: 8000
 *                         topByCommissions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               companyId:
 *                                 type: string
 *                                 example: "user456"
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               role:
 *                                 type: string
 *                                 example: "PLAYER"
 *                               _sum:
 *                                 type: object
 *                                 properties:
 *                                   amount:
 *                                     type: number
 *                                     example: 2000
 *                         mostActiveGaming:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               playerId:
 *                                 type: string
 *                                 example: "user456"
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               role:
 *                                 type: string
 *                                 example: "PLAYER"
 *                               _count:
 *                                 type: integer
 *                                 example: 100
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         totalBalance:
 *                           type: number
 *                           example: 50000
 *                         avgBalance:
 *                           type: number
 *                           example: 500
 *                         walletCount:
 *                           type: integer
 *                           example: 100
 *                         lowBalanceUsers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               role:
 *                                 type: string
 *                                 example: "PLAYER"
 *                               status:
 *                                 type: string
 *                                 example: "ACTIVE"
 *                               balance:
 *                                 type: number
 *                                 example: 50
 *                         highBalanceUsers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               role:
 *                                 type: string
 *                                 example: "PLAYER"
 *                               balance:
 *                                 type: number
 *                                 example: 15000
 *                     trends:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                                 example: "2025-01-01"
 *                               active_players:
 *                                 type: integer
 *                                 example: 50
 *                               total_bets:
 *                                 type: number
 *                                 example: 10000
 *                               total_wins:
 *                                 type: number
 *                                 example: 8000
 *                               total_commissions:
 *                                 type: number
 *                                 example: 2000
 *                               bet_count:
 *                                 type: integer
 *                                 example: 100
 *                         hourly:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               hour:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                               transaction_count:
 *                                 type: integer
 *                                 example: 50
 *                               bets:
 *                                 type: number
 *                                 example: 5000
 *                               wins:
 *                                 type: number
 *                                 example: 4000
 *                     commissions:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 5000
 *                         count:
 *                           type: integer
 *                           example: 100
 *                         byRole:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               role:
 *                                 type: string
 *                                 example: "PLAYER"
 *                               total:
 *                                 type: number
 *                                 example: 2000
 *                               count:
 *                                 type: integer
 *                                 example: 50
 *                         topEarners:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               amount:
 *                                 type: number
 *                                 example: 1000
 *                     risk:
 *                       type: object
 *                       properties:
 *                         suspiciousActivity:
 *                           type: integer
 *                           example: 5
 *                         multiAccountSuspects:
 *                           type: integer
 *                           example: 3
 *                         blockedUsers:
 *                           type: integer
 *                           example: 2
 *                         details:
 *                           type: object
 *                           properties:
 *                             suspicious:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   player_id:
 *                                     type: string
 *                                     example: "user456"
 *                                   game_count:
 *                                     type: integer
 *                                     example: 100
 *                                   avg_bet:
 *                                     type: number
 *                                     example: 50
 *                                   max_bet:
 *                                     type: number
 *                                     example: 1000
 *                                   win_rate:
 *                                     type: number
 *                                     example: 0.75
 *                             multiAccount:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   ip:
 *                                     type: string
 *                                     example: "192.168.1.1"
 *                                   _count:
 *                                     type: object
 *                                     properties:
 *                                       companyId:
 *                                         type: integer
 *                                         example: 2
 *                             blocked:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                     example: "user789"
 *                                   username:
 *                                     type: string
 *                                     example: "blocked_user"
 *                                   role:
 *                                     type: string
 *                                     example: "PLAYER"
 *                                   updatedAt:
 *                                     type: string
 *                                     format: date-time
 *                                     example: "2025-01-01T00:00:00Z"
 *                     realTime:
 *                       type: object
 *                       properties:
 *                         activeGamesLast5Min:
 *                           type: integer
 *                           example: 10
 *                         onlineUsers:
 *                           type: integer
 *                           example: 50
 *                         recentGames:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "game123"
 *                               player:
 *                                 type: string
 *                                 example: "player1"
 *                               gameType:
 *                                 type: string
 *                                 example: "SLOTS"
 *                               betAmount:
 *                                 type: number
 *                                 example: 100
 *                               result:
 *                                 type: string
 *                                 example: "WIN"
 *                               playedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                         recentTransactions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "trans123"
 *                               username:
 *                                 type: string
 *                                 example: "player1"
 *                               type:
 *                                 type: string
 *                                 example: "RECHARGE"
 *                               amount:
 *                                 type: number
 *                                 example: 100
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                     userLoginHistory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           company:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                                 example: "company_user"
 *                               role:
 *                                 type: string
 *                                 example: "ADMIN"
 *                               email:
 *                                 type: string
 *                                 example: "9FbOv@example.com"
 *                               contactNumber:
 *                                 type: string
 *                                 example: "1234567890"
 *                               status:
 *                                 type: string
 *                                 example: "ACTIVE"
 *                               isActive:
 *                                 type: boolean
 *                                 example: true
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                           ip:
 *                             type: string
 *                             example: "192.168.1.1"
 *                           location:
 *                             type: object
 *                             properties:
 *                               lat:
 *                                 type: number
 *                                 example: 37.7749
 *                               lng:
 *                                 type: number
 *                                 example: -122.4194
 *                           device:
 *                             type: object
 *                             properties:
 *                               os:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                     example: "iOS"
 *                                   version:
 *                                     type: string
 *                                     example: "13.0"
 *                               browser:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                     example: "Chrome"
 *                                   version:
 *                                     type: string
 *                                     example: "80.0"
 *                                   major:
 *                                     type: string
 *                                     example: "80"
 *                               engine:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                     example: "WebKit"
 *                                   version:
 *                                     type: string
 *                                     example: "537.36"
 *                               cpu:
 *                                 type: object
 *                                 properties:
 *                                   architecture:
 *                                     type: string
 *                                     example: "x86_64"
 *                               ua:
 *                                 type: string
 *                                 example: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1"
 *                     downlineTree:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "user123"
 *                         username:
 *                           type: string
 *                           example: "admin_user"
 *                         role:
 *                           type: string
 *                           example: "ADMIN"
 *                         status:
 *                           type: string
 *                           example: "ACTIVE"
 *                         balance:
 *                           type: number
 *                           example: 1000
 *                         points:
 *                           type: number
 *                           example: 1000
 *                         childrenCount:
 *                           type: integer
 *                           example: 10
 *                         gamesPlayed:
 *                           type: integer
 *                           example: 50
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-01T00:00:00Z"
 *                         children:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/DownlineTree'
 *                     filters:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: string
 *                           example: "PLAYER"
 *                         status:
 *                           type: string
 *                           example: "ACTIVE"
 *                         gameType:
 *                           type: string
 *                           example: "SLOTS"
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
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden (e.g., invalid role filter or role hierarchy violation)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Cannot filter by equal or higher role"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch dashboard data"
 */
router.get(
  COMPANY_ROUTES.getDownlineDashboard,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  Company.getDownlineDashboard
);

/**
 * @swagger
 * /api/company/downline/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     description: Retrieve comprehensive analytics for the admin's downline, including all roles below ADMIN.
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/role'
 *       - $ref: '#/components/parameters/status'
 *       - $ref: '#/components/parameters/gameType'
 *       - $ref: '#/components/parameters/period'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/DashboardSuccess'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  COMPANY_ROUTES.getAdminDashboard,
  requireRole("ADMIN"),
  Company.getAdminDashboard
);

/**
 * @swagger
 * /api/company/downline/distributor/dashboard:
 *   get:
 *     summary: Get distributor dashboard statistics
 *     description: Retrieve analytics for the distributor's downline, including SUB_DISTRIBUTOR, STORE, and PLAYER roles.
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/role'
 *       - $ref: '#/components/parameters/status'
 *       - $ref: '#/components/parameters/gameType'
 *       - $ref: '#/components/parameters/period'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/DashboardSuccess'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  COMPANY_ROUTES.getDistributorDashboard,
  requireRole("DISTRIBUTOR"),
  Company.getDistributorDashboard
);

/**
 * @swagger
 * /api/company/downline/sub-distributor/dashboard:
 *   get:
 *     summary: Get sub-distributor dashboard statistics
 *     description: Retrieve analytics for the sub-distributor's downline, including STORE and PLAYER roles.
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/role'
 *       - $ref: '#/components/parameters/status'
 *       - $ref: '#/components/parameters/gameType'
 *       - $ref: '#/components/parameters/period'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/DashboardSuccess'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  COMPANY_ROUTES.getSubDistributorDashboard,
  requireRole("SUB_DISTRIBUTOR"),
  Company.getSubDistributorDashboard
);

/**
 * @swagger
 * /api/company/downline/store/dashboard:
 *   get:
 *     summary: Get store dashboard statistics
 *     description: Retrieve analytics for the store's downline, including PLAYER roles.
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/role'
 *       - $ref: '#/components/parameters/status'
 *       - $ref: '#/components/parameters/gameType'
 *       - $ref: '#/components/parameters/period'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/DashboardSuccess'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  COMPANY_ROUTES.getStoreDashboard,
  requireRole("STORE"),
  Company.getStoreDashboard
);

/**
 * @swagger
 * /api/company/downline/export:
 *   get:
 *     summary: Export dashboard data
 *     description: Export downline dashboard data in JSON, CSV, or Excel format.
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel]
 *           default: json
 *         description: Export format
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/role'
 *       - $ref: '#/components/parameters/status'
 *       - $ref: '#/components/parameters/gameType'
 *       - $ref: '#/components/parameters/period'
 *     responses:
 *       200:
 *         description: Dashboard data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/DashboardSuccess'
 *           text/csv:
 *             schema:
 *               type: string
 *               example: |
 *                 Overview Statistics
 *                 Metric,Value
 *                 Total Downline,100
 *                 Active Users,80
 *                 Total Balance,50000
 *                 Total Bets,100000
 *                 Total Wins,80000
 *                 Net Revenue,20000
 *                 Hierarchy Breakdown
 *                 Role,Count,Total Balance,Total Children
 *                 PLAYER,50,25000,10
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to export dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to export dashboard data"
 */
router.get(
  COMPANY_ROUTES.exportDashboardData,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  Company.exportDashboardData
);

/**
 * @swagger
 * /api/company/downline/updates:
 *   get:
 *     summary: Get real-time dashboard updates
 *     description: Retrieve updates on new games, transactions, and status changes since the last update timestamp.
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lastUpdate
 *         schema:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the last update (default: 1 minute ago)
 *     responses:
 *       200:
 *         description: Dashboard updates fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasUpdates:
 *                       type: boolean
 *                       example: true
 *                     newGames:
 *                       type: integer
 *                       example: 5
 *                     newTransactions:
 *                       type: integer
 *                       example: 10
 *                     statusChanges:
 *                       type: integer
 *                       example: 2
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-01T00:00:00Z"
 *                 message:
 *                   type: string
 *                   example: "Dashboard updates fetched successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to check for updates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to check for updates"
 */
router.get(
  COMPANY_ROUTES.getDashboardUpdates,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  Company.getDashboardUpdates
);

/**
 * @swagger
 * /api/company/downline/user/{targetUserId}:
 *   get:
 *     summary: Get detailed statistics for a specific user
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to retrieve stats for
 *     responses:
 *       200:
 *         description: User detailed stats fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "user456"
 *                         username:
 *                           type: string
 *                           example: "player1"
 *                         email:
 *                           type: string
 *                           example: "player1@example.com"
 *                         role:
 *                           type: string
 *                           example: "PLAYER"
 *                         status:
 *                           type: string
 *                           example: "ACTIVE"
 *                         points:
 *                           type: number
 *                           example: 1000
 *                         parent:
 *                           type: object
 *                           properties:
 *                             username:
 *                               type: string
 *                               example: "store1"
 *                             role:
 *                               type: string
 *                               example: "STORE"
 *                         childrenCount:
 *                           type: integer
 *                           example: 0
 *                         contactNumber:
 *                           type: string
 *                           example: "+1234567890"
 *                         remarks:
 *                           type: string
 *                           example: "Active player"
 *                         rechargePerm:
 *                           type: boolean
 *                           example: true
 *                         withdrawPerm:
 *                           type: boolean
 *                           example: true
 *                         agentProtect:
 *                           type: boolean
 *                           example: false
 *                         lastLoggedIn:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-01T00:00:00Z"
 *                        

 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-01T00:00:00Z"
 *                     config:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         balance:
 *                           type: number
 *                           example: 500
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-01T00:00:00Z"
 *                     gaming:
 *                       type: object
 *                       properties:
 *                         totalGames:
 *                           type: integer
 *                           example: 50
 *                         totalBets:
 *                           type: number
 *                           example: 5000
 *                         totalWins:
 *                           type: number
 *                           example: 4000
 *                         netProfit:
 *                           type: number
 *                           example: -1000
 *                         winRate:
 *                           type: string
 *                           example: "40.00"
 *                         recentGames:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "game123"
 *                               gameType:
 *                                 type: string
 *                                 example: "SLOTS"
 *                               betAmount:
 *                                 type: number
 *                                 example: 100
 *                               winAmount:
 *                                 type: number
 *                                 example: 200
 *                               result:
 *                                 type: string
 *                                 example: "WIN"
 *                               playedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                     financial:
 *                       type: object
 *                       properties:
 *                         ledgerSummary:
 *                           type: object
 *                           additionalProperties:
 *                             type: object
 *                             properties:
 *                               total:
 *                                 type: number
 *                                 example: 1000
 *                               count:
 *                                 type: integer
 *                                 example: 10
 *                         recentTransactions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "trans123"
 *                               type:
 *                                 type: string
 *                                 example: "RECHARGE"
 *                               amount:
 *                                 type: number
 *                                 example: 100
 *                               remark:
 *                                 type: string
 *                                 example: "Deposit"
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                     activity:
 *                       type: object
 *                       properties:
 *                         totalActivities:
 *                           type: integer
 *                           example: 50
 *                         recentActivities:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "act123"
 *                               ip:
 *                                 type: string
 *                                 example: "192.168.1.1"
 *                               device:
 *                                 type: object
 *                                 additionalProperties:
 *                                   type: string
 *                               location:
 *                                 type: object
 *                                 additionalProperties:
 *                                   type: string
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2025-01-01T00:00:00Z"
 *                 message:
 *                   type: string
 *                   example: "User detailed stats fetched successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Unauthorized access or role hierarchy violation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized access"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to fetch user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch user details"
 */

router.get(
  COMPANY_ROUTES.getUserDetailedStats,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  Company.getUserDetailedStats
);

/**
 * @swagger
 * /api/company/downline/compare:
 *   get:
 *     summary: Get comparative analysis of dashboard data
 *     description: Compare dashboard statistics between current and previous periods.
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: compareWith
 *         schema:
 *           type: string
 *           enum: [previous_period, parent, siblings]
 *           description: Comparison type
 *     responses:
 *       200:
 *         description: Comparative analysis fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               format: date-time
 *                               example: "2025-01-01T00:00:00Z"
 *                             end:
 *                               type: string
 *                               format: date-time
 *                               example: "2025-01-31T23:59:59Z"
 *                         previous:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               format: date-time
 *                               example: "2024-12-01T00:00:00Z"
 *                             end:
 *                               type: string
 *                               format: date-time
 *                               example: "2024-12-31T23:59:59Z"
 *                     comparison:
 *                       type: object
 *                       properties:
 *                         totalDownline:
 *                           type: object
 *                           properties:
 *                             current:
 *                               type: integer
 *                               example: 100
 *                             previous:
 *                               type: integer
 *                               example: 90
 *                             change:
 *                               type: integer
 *                               example: 10
 *                             changePercent:
 *                               type: string
 *                               example: "11.11"
 *                         activeUsers:
 *                           type: object
 *                           properties:
 *                             current:
 *                               type: integer
 *                               example: 80
 *                             previous:
 *                               type: integer
 *                               example: 70
 *                             change:
 *                               type: integer
 *                               example: 10
 *                             changePercent:
 *                               type: string
 *                               example: "14.29"
 *                         totalBets:
 *                           type: object
 *                           properties:
 *                             current:
 *                               type: number
 *                               example: 100000
 *                             previous:
 *                               type: number
 *                               example: 90000
 *                             change:
 *                               type: number
 *                               example: 10000
 *                             changePercent:
 *                               type: string
 *                               example: "11.11"
 *                         netRevenue:
 *                           type: object
 *                           properties:
 *                             current:
 *                               type: number
 *                               example: 20000
 *                             previous:
 *                               type: number
 *                               example: 18000
 *                             change:
 *                               type: number
 *                               example: 2000
 *                             changePercent:
 *                               type: string
 *                               example: "11.11"
 *                         commissions:
 *                           type: object
 *                           properties:
 *                             current:
 *                               type: number
 *                               example: 5000
 *                             previous:
 *                               type: number
 *                               example: 4500
 *                             change:
 *                               type: number
 *                               example: 500
 *                             changePercent:
 *                               type: string
 *                               example: "11.11"
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "Active users increased by 14.29% - strong growth trend"
 *                 message:
 *                   type: string
 *                   example: "Comparative analysis fetched successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to generate comparative analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to generate comparative analysis"
 */
router.get(
  COMPANY_ROUTES.getComparativeAnalysis,
  requireRole("ADMIN", "DISTRIBUTOR", "SUB_DISTRIBUTOR", "STORE"),
  Company.getComparativeAnalysis
);

export const COMPANY_ROUTE = router;
