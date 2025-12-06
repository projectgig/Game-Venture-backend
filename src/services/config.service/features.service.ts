import { prisma } from "@game/database/prismaClient";

export const FeatureService = {
  create: (data: any) => prisma.featureFlag.create({ data }),
  update: (id: string, data: any) =>
    prisma.featureFlag.update({ where: { id }, data }),
  delete: (id: string) => prisma.featureFlag.delete({ where: { id } }),
};
