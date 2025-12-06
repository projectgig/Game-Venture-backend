import { prisma } from "@game/database/prismaClient";

export const LegalService = {
  async create(data: any) {
    return prisma.legalPage.create({ data });
  },

  async update(id: string, data: any) {
    return prisma.legalPage.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.legalPage.delete({ where: { id } });
  },
};
