import { db } from "@game/database/prismaClient";
import { Company, PaymentMerchant, Prisma, Wallet } from "@prisma/client";
import { prisma } from "@game/database/prismaClient";

export async function loadCoins(
  adminId: string,
  playerId: string,
  amount: number
) {
  const admin = await db.findUnique<Company>("company", {
    where: { id: adminId },
  });

  if (!admin || admin.role !== "ADMIN") {
    throw new Error("Unauthorized: Only admins can load coins.");
  }

  const player = (await db.findUnique<Company>("company", {
    where: { id: playerId },
    include: { Wallet: true },
  })) as any;

  if (!player || player.role !== "PLAYER") {
    throw new Error("Invalid player.");
  }

  let playerWallet = player.Wallet;

  if (!playerWallet) {
    playerWallet = await db.create<Wallet>("wallet", {
      data: { companyId: player.id, balance: new Prisma.Decimal(0) },
    });
  }

  const newBalance = playerWallet.balance.add(new Prisma.Decimal(amount));

  const [payment, ledger, wallet] = await db.transaction([
    prisma.payment.create({
      data: {
        companyId: player.id,
        amount,
        currency: "COIN",
        topupBalance: amount,
        merchant: PaymentMerchant.ADMIN,
        status: "PAID",
      },
    }),
    prisma.ledger.create({
      data: {
        companyId: player.id,
        walletId: playerWallet.id,
        type: "RECHARGE",
        amount,
        balance: newBalance,
        remark: `Coin load from admin (${admin.username})`,
      },
    }),
    prisma.wallet.update({
      where: { id: playerWallet.id },
      data: { balance: newBalance },
    }),
    prisma.company.update({
      where: { id: player.id },
      data: {
        points: newBalance,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "LOAD_COINS",
        targetId: player.id,
        details: {
          amount,
          playerUsername: player.username,
          adminUsername: admin.username,
        },
      },
    }),
    prisma.companyActivity.create({
      data: {
        companyId: admin.id,
        ip: "SYSTEM",
        device: { action: "load_coins", amount },
      },
    }),
  ]);

  return {
    message: `Successfully loaded ${amount} coins to ${player.username}`,
    payment,
    ledger,
    newBalance: wallet.balance,
  };
}
