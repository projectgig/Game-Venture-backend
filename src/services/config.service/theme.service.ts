import { prisma } from "@game/database/prismaClient";

export const ThemeService = {
  async updateTheme(data: any) {
    return prisma.themeConfig.upsert({
      where: { configId: data.configId },
      create: data,
      update: data,
    });
  },
};
