import { NavController } from "@game/controllers";
import { Router } from "express";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Navigation
 *     description: Navigation menu management
 *   - name: Footer
 *     description: Footer configuration & content
 */

/**
 * @swagger
 * /nav/menu:
 *   post:
 *     summary: Create a navigation menu
 *     tags: [Navigation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NavMenuCreateInput'
 *     responses:
 *       201:
 *         description: Menu created successfully
 */
router.post("/", NavController.createMenu);

/* @swagger
 * /nav/menu/{id}:
 *   put:
 *     summary: Update a navigation menu
 *     tags: [Navigation]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NavMenuUpdateInput'
 *     responses:
 *       200:
 *         description: Menu updated
 */
router.put("/item/:id", NavController.updateMenuItem);

/**
 * @swagger
 * /nav/menu/{id}:
 *   delete:
 *     summary: Delete a navigation menu
 *     tags: [Navigation]
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/item/:id", NavController.deleteMenuItem);

/* @swagger
 * /nav:
 *   get:
 *     summary: Get all navigation menus
 *     tags: [Navigation]
 *     responses:
 *       200:
 *         description: List of navigation menus
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NavMenu'
 *       500:
 *         description: Internal server error
 */
router.get("/", NavController.getMenus);

/**
 * @swagger
 * /nav/item:
 *   post:
 *     summary: Create a navigation item
 *     tags: [Navigation]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NavItemCreateInput'
 */
router.post("/item", NavController.addMenuItem);

export const NAVBAR_ROUTES = router;
