import { prisma } from "@game/database/prismaClient";

export const AboutService = {
  async updateAbout(data: any) {
    return prisma.aboutUs.upsert({
      where: { configId: data.configId },
      create: data,
      update: data,
    });
  },
};
