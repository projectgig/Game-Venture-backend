import { prisma } from "@game/database/prismaClient";

export const FAQService = {
  create: (data: any) => prisma.fAQ.create({ data }),
  update: (id: string, data: any) => prisma.fAQ.update({ where: { id }, data }),
  delete: (id: string) => prisma.fAQ.delete({ where: { id } }),
};
