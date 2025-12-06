import { prisma } from "@game/database/prismaClient";

export const ContactService = {
  async updateContact(data: any) {
    return prisma.contactInfo.upsert({
      where: { configId: data.configId },
      create: data,
      update: data,
    });
  },
};
