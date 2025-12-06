import { Request, Response } from "express";
import { ContactService } from "@game/services/config.service";

export const ContactController = {
  async update(req: Request, res: Response) {
    const contact = await ContactService.ContactService.updateContact(req.body);
    res.json({ success: true, contact });
  },
};
