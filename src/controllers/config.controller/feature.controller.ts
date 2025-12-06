import { Request, Response } from "express";
import { FeatureService } from "@game/services/config.service";

export const FeatureController = {
  async create(req: Request, res: Response) {
    const flag = await FeatureService.FeatureService.create(req.body);
    res.json({ success: true, flag });
  },

  async update(req: Request, res: Response) {
    const flag = await FeatureService.FeatureService.update(
      req.params.id,
      req.body
    );
    res.json({ success: true, flag });
  },

  async delete(req: Request, res: Response) {
    await FeatureService.FeatureService.delete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  },
};
