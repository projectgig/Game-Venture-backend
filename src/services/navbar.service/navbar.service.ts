import { prisma } from "@game/database/prismaClient";

export const NavService = {
  getMenus: () => {
    return prisma.navMenu.findMany({
      include: {
        items: {
          where: { parentId: null },
          orderBy: { order: "asc" },
          include: {
            children: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
  },

  createMenu: (data: any) => {
    return prisma.navMenu.create({ data });
  },

  addMenuItem: (data: any) => {
    return prisma.navItem.create({ data });
  },

  updateMenuItem: (id: string, data: any) => {
    return prisma.navItem.update({
      where: { id },
      data,
    });
  },

  deleteMenuItem: (id: string) => {
    return prisma.navItem.delete({ where: { id } });
  },
};
