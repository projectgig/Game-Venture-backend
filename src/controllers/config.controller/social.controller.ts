import { Request, Response } from "express";
import { SocialService } from "@game/services/config.service";

export const SocialController = {
  async create(req: Request, res: Response) {
    const link = await SocialService.SocialService.create(req.body);
    res.json({ success: true, link });
  },

  async update(req: Request, res: Response) {
    const link = await SocialService.SocialService.update(
      req.params.id,
      req.body
    );
    res.json({ success: true, link });
  },

  async delete(req: Request, res: Response) {
    await SocialService.SocialService.delete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  },
};
