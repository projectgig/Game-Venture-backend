import { FAQService } from "@game/services/config.service";
import { Request, Response } from "express";

export const FAQController = {
  async create(req: Request, res: Response) {
    const faq = await FAQService.FAQService.create(req.body);
    res.json({ success: true, faq });
  },

  async update(req: Request, res: Response) {
    const faq = await FAQService.FAQService.update(req.params.id, req.body);
    res.json({ success: true, faq });
  },

  async delete(req: Request, res: Response) {
    await FAQService.FAQService.delete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  },
};
