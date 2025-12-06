import { FooterController } from "@game/controllers";
import { Router } from "express";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Footer
 *   description: Footer configuration & content
 */

/**
 * @swagger
 * /footer:
 *   get:
 *     summary: Get complete footer config
 *     tags: [Footer]
 *     responses:
 *       200:
 *         description: Complete footer config
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Footer'
 */
router.get("/", FooterController.FooterController.getFooter);
router.post("/section", FooterController.FooterController.createSection);
router.post("/link", FooterController.FooterController.addLink);
router.put("/link/:id", FooterController.FooterController.updateLink);
router.delete("/link/:id", FooterController.FooterController.deleteLink);

export const FOOTER_ROUTES = router;
