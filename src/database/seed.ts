import bcrypt from "bcryptjs";
import logger from "@game/common/logger/logger";
import { env } from "@game/config/env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function shutdown() {
  await prisma.$disconnect();
}

export async function SeedAdmin() {
  try {
    const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

    const existing = await prisma.company.findFirst({
      where: { username: env.ADMIN_USERNAME },
    });

    if (!existing) {
      await prisma.company.create({
        data: {
          username: env.ADMIN_USERNAME,
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      logger.info("Admin user created");
    } else {
      logger.info("Admin user already exists");
    }
  } catch (error) {
    logger.error(error);
  } finally {
    await shutdown();
  }
}
