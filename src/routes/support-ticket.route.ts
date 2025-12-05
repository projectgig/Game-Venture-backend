import { SupportTickertController } from "@game/controllers";
import { authenticateToken } from "@game/core/common/middleware/auth.middleware";
import { Router } from "express";

const router = Router();
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     SupportTicket:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique ticket identifier
 *         parentId:
 *           type: string
 *           nullable: true
 *           description: Parent ticket ID for threaded conversations
 *         companyId:
 *           type: string
 *           description: Company ID that created the ticket
 *         subject:
 *           type: string
 *           description: Ticket subject/title
 *         description:
 *           type: string
 *           description: Detailed description of the issue
 *         priority:
 *           type: string
 *           enum: [HIGH, MEDIUM, LOW]
 *           description: Ticket priority level
 *         status:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, RESOLVED, CLOSED]
 *           description: Current ticket status
 *         file:
 *           type: string
 *           nullable: true
 *           description: Attached file URL or path
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Ticket creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     CreateTicketRequest:
 *       type: object
 *       required:
 *         - subject
 *         - description
 *         - priority
 *       properties:
 *         subject:
 *           type: string
 *           example: "Unable to access dashboard"
 *         description:
 *           type: string
 *           example: "I'm getting a 403 error when trying to access the dashboard"
 *         priority:
 *           type: string
 *           enum: [HIGH, MEDIUM, LOW]
 *           example: "HIGH"
 *         parentId:
 *           type: string
 *           nullable: true
 *           description: Optional parent ticket ID for replies
 *         file:
 *           type: string
 *           nullable: true
 *           description: Optional file attachment URL
 *     UpdateTicketRequest:
 *       type: object
 *       properties:
 *         subject:
 *           type: string
 *           example: "Unable to access dashboard - RESOLVED"
 *         description:
 *           type: string
 *           example: "Updated description with more details"
 *         priority:
 *           type: string
 *           enum: [HIGH, MEDIUM, LOW]
 *           example: "MEDIUM"
 *         status:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, RESOLVED, CLOSED]
 *           example: "IN_PROGRESS"
 *         file:
 *           type: string
 *           nullable: true
 *     TicketStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of tickets
 *         byStatus:
 *           type: object
 *           properties:
 *             open:
 *               type: integer
 *             inProgress:
 *               type: integer
 *             resolved:
 *               type: integer
 *             closed:
 *               type: integer
 *         byPriority:
 *           type: object
 *           properties:
 *             HIGH:
 *               type: integer
 *             MEDIUM:
 *               type: integer
 *             LOW:
 *               type: integer
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/support-tickets:
 *   post:
 *     summary: Create a new support ticket
 *     description: Allows authenticated users to create a support ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTicketRequest'
 *     responses:
 *       201:
 *         description: Support ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Support ticket created successfully"
 *                 ticket:
 *                   $ref: '#/components/schemas/SupportTicket'
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: Parent ticket not found
 *       500:
 *         description: Internal server error
 */
router.post("/", SupportTickertController.default.createTicket);

/**
 * @swagger
 * /api/support-tickets:
 *   get:
 *     summary: Get all support tickets
 *     description: Retrieve all tickets. Regular users see only their company's tickets, Admin/Support see all tickets
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, RESOLVED, CLOSED]
 *         description: Filter tickets by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [HIGH, MEDIUM, LOW]
 *         description: Filter tickets by priority
 *     responses:
 *       200:
 *         description: List of support tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tickets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SupportTicket'
 *                 count:
 *                   type: integer
 *                   description: Total number of tickets returned
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", SupportTickertController.default.getTickets);

/**
 * @swagger
 * /api/support-tickets/stats:
 *   get:
 *     summary: Get ticket statistics
 *     description: Retrieve statistics about support tickets (Admin/Support only)
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Support privileges required
 *       500:
 *         description: Internal server error
 */
router.get("/stats", SupportTickertController.default.getTicketStats);

/**
 * @swagger
 * /api/support-tickets/{id}:
 *   get:
 *     summary: Get a specific support ticket
 *     description: Retrieve details of a specific ticket by ID
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupportTicket'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied to this ticket
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", SupportTickertController.default.getTicketById);

/**
 * @swagger
 * /api/support-tickets/{id}:
 *   put:
 *     summary: Update a support ticket
 *     description: Update ticket details (own company only, or Admin/Support)
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTicketRequest'
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ticket updated successfully"
 *                 ticket:
 *                   $ref: '#/components/schemas/SupportTicket'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", SupportTickertController.default.updateTicket);

/**
 * @swagger
 * /api/support-tickets/{id}/close:
 *   patch:
 *     summary: Close a support ticket
 *     description: Mark a ticket as closed (own company only, or Admin/Support)
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: string
 *                 description: Optional resolution notes
 *     responses:
 *       200:
 *         description: Ticket closed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ticket closed successfully"
 *                 ticket:
 *                   $ref: '#/components/schemas/SupportTicket'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/close", SupportTickertController.default.closeTicket);

/**
 * @swagger
 * /api/support-tickets/{id}:
 *   delete:
 *     summary: Delete a support ticket
 *     description: Permanently delete a ticket (Admin only)
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ticket deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin privileges required
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", SupportTickertController.default.deleteTicket);

export const SUPPORT_TICKET_ROUTES = router;
