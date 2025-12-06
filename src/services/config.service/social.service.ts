import { prisma } from "@game/database/prismaClient";

export const SocialService = {
  create: (data: any) => prisma.socialLink.create({ data }),
  update: (id: string, data: any) =>
    prisma.socialLink.update({ where: { id }, data }),
  delete: (id: string) => prisma.socialLink.delete({ where: { id } }),
};
