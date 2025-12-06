import { Request, Response } from "express";
import { SiteConfigService } from "@game/services/config.service";

export const SiteConfigController = {
  async getConfig(req: Request, res: Response) {
    const config = await SiteConfigService.SiteConfigService.getConfig();
    return res.json({ success: true, config });
  },

  async init(req: Request, res: Response) {
    const config = await SiteConfigService.SiteConfigService.initConfig();
    return res.json({ success: true, config });
  },

  async update(req: Request, res: Response) {
    const updated = await SiteConfigService.SiteConfigService.updateBaseConfig(
      req.body
    );
    return res.json({ success: true, updated });
  },
};
