import { prisma } from "@game/database/prismaClient";

export const FooterService = {
  getFooter: () => {
    return prisma.footer.findFirst({
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { links: true },
        },
        social: { orderBy: { order: "asc" } },
        contact: true,
      },
    });
  },

  upsertFooter: (data: any) => {
    return prisma.footer.upsert({
      where: { id: data.id ?? "default-footer" },
      create: data,
      update: data,
    });
  },

  createSection: (data: any) => {
    return prisma.footerSection.create({ data });
  },

  addLink: (data: any) => {
    return prisma.footerLink.create({ data });
  },

  updateSection: (id: string, data: any) => {
    return prisma.footerSection.update({ where: { id }, data });
  },

  updateLink: (id: string, data: any) => {
    return prisma.footerLink.update({ where: { id }, data });
  },

  deleteLink: (id: string) => {
    return prisma.footerLink.delete({ where: { id } });
  },
};
