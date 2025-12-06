import { LegalService } from "@game/services/config.service";
import { Request, Response } from "express";

export const LegalController = {
  async create(req: Request, res: Response) {
    const page = await LegalService.LegalService.create(req.body);
    res.json({ success: true, page });
  },

  async update(req: Request, res: Response) {
    const page = await LegalService.LegalService.update(
      req.params.id,
      req.body
    );
    res.json({ success: true, page });
  },

  async delete(req: Request, res: Response) {
    await LegalService.LegalService.delete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  },
};
