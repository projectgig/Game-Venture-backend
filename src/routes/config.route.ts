import { Router } from "express";
import {
  AboutController,
  ContactController,
  FAQController,
  FeatureController,
  LegalController,
  SiteConfigController,
  SocialController,
  ThemeController,
} from "@game/controllers/config.controller";
import { authenticateToken } from "@game/core/common/middleware/auth.middleware";
import { requireRole } from "@game/core/common/middleware/rbac.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: SiteConfig
 *   description: Base site configuration
 */

/**
 * @swagger
 * /config:
 *   get:
 *     summary: Get full site configuration
 *     tags: [SiteConfig]
 *     responses:
 *       200:
 *         description: Returns all configuration
 */
router.get("/", SiteConfigController.getConfig);

/**
 * @swagger
 * /config/init:
 *   post:
 *     summary: Initialize site configuration
 *     tags: [SiteConfig]
 *     responses:
 *       200:
 *         description: Config initialized
 */
router.post("/init", authenticateToken, SiteConfigController.init);

/**
 * @swagger
 * /config:
 *   put:
 *     summary: Update base site config
 *     tags: [SiteConfig]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               siteName: "My Website"
 *               language: "en"
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put(
  "/",
  authenticateToken,
  requireRole("ADMIN"),
  SiteConfigController.update
);

/**
 * @swagger
 * tags:
 *   name: Theme
 *   description: Theme configuration
 */

/**
 * @swagger
 * /config/theme:
 *   put:
 *     summary: Update theme settings
 *     tags: [Theme]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             example:
 *               primaryColor: "#000000"
 *               secondaryColor: "#ffffff"
 *               fontFamily: "Inter"
 *     responses:
 *       200:
 *         description: Theme updated
 */
router.put("/theme", authenticateToken, ThemeController.update);

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Contact information
 */

/**
 * @swagger
 * /config/contact:
 *   put:
 *     summary: Update contact information
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: "support@example.com"
 *             phone: "+977-9812345678"
 *             address: "Kathmandu, Nepal"
 *     responses:
 *       200:
 *         description: Contact updated
 */
router.put(
  "/contact",
  authenticateToken,
  requireRole("ADMIN"),
  ContactController.update
);

/**
 * @swagger
 * tags:
 *   name: About
 *   description: About us details
 */

/**
 * @swagger
 * /config/about:
 *   put:
 *     summary: Update about us section
 *     tags: [About]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             description: "We are a leading software company..."
 *     responses:
 *       200:
 *         description: About updated
 */
router.put(
  "/about",
  authenticateToken,
  requireRole("ADMIN"),
  AboutController.update
);

/**
 * @swagger
 * tags:
 *   name: FAQ
 *   description: Frequently asked questions
 */

/**
 * @swagger
 * /config/faq:
 *   post:
 *     summary: Create FAQ
 *     tags: [FAQ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             question: "What is your refund policy?"
 *             answer: "Refunds are available..."
 *     responses:
 *       200:
 *         description: FAQ created
 */
router.post(
  "/faq",
  authenticateToken,
  requireRole("ADMIN"),
  FAQController.create
);

/**
 * @swagger
 * /config/faq/{id}:
 *   put:
 *     summary: Update FAQ
 *     tags: [FAQ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: FAQ updated
 */
router.put(
  "/faq/:id",
  authenticateToken,
  requireRole("ADMIN"),
  FAQController.update
);

/**
 * @swagger
 * /config/faq/{id}:
 *   delete:
 *     summary: Delete FAQ
 *     tags: [FAQ]
 *     parameters:
 *       - in: path
 *         name: id
 *     responses:
 *       200:
 *         description: FAQ deleted
 */
router.delete(
  "/faq/:id",
  authenticateToken,
  requireRole("ADMIN"),
  FAQController.delete
);

/**
 * @swagger
 * tags:
 *   name: Legal
 *   description: Legal policy pages
 */

/**
 * @swagger
 * /config/legal:
 *   post:
 *     summary: Create legal page
 *     tags: [Legal]
 */
router.post(
  "/legal",
  authenticateToken,
  requireRole("ADMIN"),
  LegalController.create
);

/**
 * @swagger
 * /config/legal/{id}:
 *   put:
 *     summary: Update legal page
 *     tags: [Legal]
 */
router.put(
  "/legal/:id",
  authenticateToken,
  requireRole("ADMIN"),
  LegalController.update
);

/**
 * @swagger
 * /config/legal/{id}:
 *   delete:
 *     summary: Delete legal page
 *     tags: [Legal]
 */
router.delete(
  "/legal/:id",
  authenticateToken,
  requireRole("ADMIN"),
  LegalController.delete
);

/**
 * @swagger
 * tags:
 *   name: Features
 *   description: Feature toggles
 */

/**
 * @swagger
 * /config/feature:
 *   post:
 *     summary: Create feature flag
 *     tags: [Features]
 */
router.post(
  "/feature",
  authenticateToken,
  requireRole("ADMIN"),
  FeatureController.create
);

/**
 * @swagger
 * /config/feature/{id}:
 *   put:
 *     summary: Update feature flag
 *     tags: [Features]
 */
router.put(
  "/feature/:id",
  authenticateToken,
  requireRole("ADMIN"),
  FeatureController.update
);

/**
 * @swagger
 * /config/feature/{id}:
 *   delete:
 *     summary: Delete feature flag
 *     tags: [Features]
 */
router.delete(
  "/feature/:id",
  authenticateToken,
  requireRole("ADMIN"),
  FeatureController.delete
);

/**
 * @swagger
 * tags:
 *   name: Social
 *   description: Social media links
 */

/**
 * @swagger
 * /config/social:
 *   post:
 *     summary: Add social link
 *     tags: [Social]
 */
router.post(
  "/social",
  authenticateToken,
  requireRole("ADMIN"),
  SocialController.create
);

/**
 * @swagger
 * /config/social/{id}:
 *   put:
 *     summary: Update social link
 *     tags: [Social]
 */
router.put(
  "/social/:id",
  authenticateToken,
  requireRole("ADMIN"),
  SocialController.update
);

/**
 * @swagger
 * /config/social/{id}:
 *   delete:
 *     summary: Delete social link
 *     tags: [Social]
 */
router.delete(
  "/social/:id",
  authenticateToken,
  requireRole("ADMIN"),
  SocialController.delete
);

export const CONFIG_ROUTES = router;
