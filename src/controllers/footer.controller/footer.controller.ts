import { Request, Response } from "express";
import { FooterService } from "@game/services/footer.service/footer.service";

export const FooterController = {
  async getFooter(req: Request, res: Response) {
    const footer = await FooterService.getFooter();
    res.json({ success: true, footer });
  },

  async createSection(req: Request, res: Response) {
    const { title, footerId, order } = req.body;
    const section = await FooterService.createSection({
      title,
      footerId,
      order,
    });
    res.json({ success: true, section });
  },

  async addLink(req: Request, res: Response) {
    const { label, url, sectionId, external } = req.body;
    const link = await FooterService.addLink({
      label,
      url,
      sectionId,
      external,
    });
    res.json({ success: true, link });
  },

  async updateLink(req: Request, res: Response) {
    const { id } = req.params;
    const link = await FooterService.updateLink(id, req.body);
    res.json({ success: true, link });
  },

  async deleteLink(req: Request, res: Response) {
    const { id } = req.params;
    await FooterService.deleteLink(id);
    res.json({ success: true, message: "Link deleted" });
  },
};
