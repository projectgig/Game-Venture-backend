import { Request, Response } from "express";
import { ThemeService } from "@game/services/config.service";

export const ThemeController = {
  async update(req: Request, res: Response) {
    const theme = await ThemeService.ThemeService.updateTheme(req.body);
    res.json({ success: true, theme });
  },
};
