import { NavService } from "@game/services/navbar.service/navbar.service";
import { Request, Response } from "express";

export const NavController = {
  async getMenus(req: Request, res: Response) {
    const menus = await NavService.getMenus();
    res.json({ success: true, menus });
  },

  async createMenu(req: Request, res: Response) {
    const { name, key } = req.body;
    const menu = await NavService.createMenu({ name, key });
    res.json({ success: true, menu });
  },

  async addMenuItem(req: Request, res: Response) {
    const { label, url, menuId, parentId, order, external, icon } = req.body;

    const item = await NavService.addMenuItem({
      label,
      url,
      menuId,
      parentId,
      order,
      external,
      icon,
    });

    res.json({ success: true, item });
  },

  async updateMenuItem(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;

    const item = await NavService.updateMenuItem(id, data);
    res.json({ success: true, item });
  },

  async deleteMenuItem(req: Request, res: Response) {
    const { id } = req.params;

    await NavService.deleteMenuItem(id);
    res.json({ success: true, message: "Item deleted" });
  },
};
