import { prisma } from "@game/database/prismaClient";

export const SiteConfigService = {
  async getConfig() {
    return prisma.siteConfig.findFirst({
      include: {
        theme: true,
        contactInfo: true,
        seo: true,
        about: true,
        faqs: true,
        legalPages: true,
        socialLinks: true,
        featureFlags: true,
      },
    });
  },

  async initConfig() {
    return prisma.siteConfig.upsert({
      where: { id: "main-config" },
      create: { id: "main-config", siteName: "My Site" },
      update: {},
    });
  },

  async updateBaseConfig(data: any) {
    return prisma.siteConfig.update({
      where: { id: data.id ?? "main-config" },
      data,
    });
  },
};
