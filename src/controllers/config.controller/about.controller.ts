import { Request, Response } from "express";
import { AboutService } from "@game/services/config.service";

export const AboutController = {
  async update(req: Request, res: Response) {
    const about = await AboutService.AboutService.updateAbout(req.body);
    res.json({ success: true, about });
  },
};
