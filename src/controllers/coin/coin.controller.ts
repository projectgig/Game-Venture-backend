import { Request, Response } from "express";
import { Company, PaymentMerchant, Prisma, Role, Wallet } from "@prisma/client";
import { db, prisma } from "@game/database/prismaClient";
import { canAssign, isInMyHierarchy } from "../company/company.controller";
import { StatusCodes } from "http-status-codes";

/**
 * Load coins for admin only
 * @param adminId
 * @param amount
 * @returns
 */
export async function loadCoins(adminId: string, amount: number) {
  if (amount <= 0) throw new Error("Invalid amount");

  const admin = await prisma.company.findUnique({
    where: { id: adminId },
  });

  if (!admin || admin.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Only admins can load coins");
  }

  let adminWallet = await prisma.wallet.findUnique({
    where: { companyId: adminId },
  });

  if (!adminWallet) {
    adminWallet = await prisma.wallet.create({
      data: { companyId: adminId, balance: new Prisma.Decimal(0) },
    });
  }

  const decimalAmount = new Prisma.Decimal(amount);
  const newBalance = adminWallet.balance.add(decimalAmount);

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        companyId: admin.id,
        amount: decimalAmount,
        currency: "COIN",
        topupBalance: decimalAmount,
        merchant: PaymentMerchant.ADMIN,
        status: "PAID",
      },
    });

    const ledger = await tx.ledger.create({
      data: {
        companyId: admin.id,
        walletId: adminWallet.id,
        type: "RECHARGE",
        amount: decimalAmount,
        balance: newBalance,
        remark: `Admin self-loaded coins`,
      },
    });

    const wallet = await tx.wallet.update({
      where: { id: adminWallet.id },
      data: { balance: newBalance },
    });

    await tx.company.update({
      where: { id: admin.id },
      data: { points: Number(newBalance) },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "LOAD_COINS_SELF",
        targetId: admin.id,
        details: { amount, adminUsername: admin.username },
      },
    });

    return {
      message: `Admin loaded +${amount} coins successfully!`,
      payment,
      ledger,
      balance: wallet.balance,
    };
  });
}

/**
 * Load coins to user wallet hierarchy order
 * @param req
 * @param res
 * @returns
 */
export const assignCoin = async (req: Request, res: Response) => {
  try {
    const sender = req.user;
    if (!sender) return res.status(401).json({ message: "Unauthorized" });

    const { targetId, amount } = req.body;
    if (!targetId || !amount)
      return res.status(400).json({ message: "targetId & amount required" });

    const senderCompany = await db.findUnique<Company>("company", {
      where: { id: sender.id },
    });

    const targetCompany = await db.findUnique<Company>("company", {
      where: { id: targetId },
    });

    if (!senderCompany || !targetCompany)
      return res.status(404).json({ message: "Company not found" });

    const isAdmin = senderCompany.role === Role.ADMIN;

    if (!isAdmin) {
      const allowed = await isInMyHierarchy(sender.id, targetId);
      if (!allowed)
        return res.status(403).json({ message: "Target not in hierarchy" });

      if (!canAssign(senderCompany.role, targetCompany.role)) {
        return res.status(403).json({
          message: `A ${senderCompany.role} cannot assign coin to a ${targetCompany.role}`,
        });
      }
    }

    const senderWallet =
      (await db.findUnique<Wallet>("wallet", {
        where: { companyId: senderCompany.id },
      })) ??
      ((await db.create("wallet", {
        data: { companyId: senderCompany.id, balance: 0 },
      })) as Wallet);

    const targetWallet =
      (await db.findUnique<Wallet>("wallet", {
        where: { companyId: targetCompany.id },
      })) ??
      ((await db.create("wallet", {
        data: { companyId: targetCompany.id, balance: 0 },
      })) as Wallet);

    if (senderWallet.balance < amount)
      return res.status(400).json({ message: "Insufficient balance" });

    const newSenderBal = Number(senderWallet.balance) - amount;
    const newTargetBal = +targetWallet.balance + +amount;

    await prisma.$transaction(async (tx) => {
      // sender wallet
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: newSenderBal },
      });

      // target wallet
      await tx.wallet.update({
        where: { id: targetWallet.id },
        data: { balance: newTargetBal },
      });

      // update sender points
      await tx.company.update({
        where: { id: senderCompany.id },
        data: {
          points: {
            decrement: amount,
          },
        },
      });

      // update target points
      await tx.company.update({
        where: { id: targetCompany.id },
        data: {
          points: {
            increment: amount,
          },
        },
      });

      // sender ledger
      await tx.ledger.create({
        data: {
          companyId: senderCompany.id,
          walletId: senderWallet.id,
          type: "WITHDRAW",
          amount,
          balance: newSenderBal,
          sourceType: "COMPANY",
          sourceId: targetCompany.id,
          remark: `Transfer to ${targetCompany.username}`,
        },
      });

      // target ledger
      await tx.ledger.create({
        data: {
          companyId: targetCompany.id,
          walletId: targetWallet.id,
          type: "RECHARGE",
          amount,
          balance: newTargetBal,
          sourceType: "COMPANY",
          sourceId: senderCompany.id,
          remark: `Received from ${senderCompany.username}`,
        },
      });
    });

    return res.json({
      message: `Successfully transferred ${amount} coins`,
      senderBalance: newSenderBal,
      targetBalance: newTargetBal,
    });
  } catch (err) {
    console.error("Assign coin error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get transactions history for user hierarchy
 * @param req
 * @param res
 * @returns
 */
export const transactionsHistoryHierarchy = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized access" });

    const { limit = 10, page = 1 } = req.query;

    const skip = (+page - 1) * +limit;

    const [total, ledger] = await Promise.all([
      prisma.ledger.count({
        where: { company: { parentId: user.id } },
      }) as Promise<number>,

      prisma.ledger.findMany({
        where: {
          company: {
            parentId: user.id,
          },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          balance: true,
          createdAt: true,
          sourceType: true,
          sourceId: true,
          company: { select: { username: true, email: true, role: true } },
          remark: true,
        },
        take: +limit,
        skip,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.json({
      meta: {
        total,
        page: +page,
        limit: +limit,
        lastPage: Math.ceil(+total / +limit),
        nextPage: +page + 1 > Math.ceil(+total / +limit) ? null : +page + 1,
        prevPage: +page - 1 < 1 ? null : +page - 1,
      },
      data: ledger,
    });
  } catch (err) {
    console.error("Transactions history error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get current user transactions
 * @param req
 * @param res
 * @returns
 */
export const getMyTransactions = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized access" });

    const { limit = 10, page = 1 } = req.query;

    const skip = (+page - 1) * +limit;

    const [total, ledger] = await Promise.all([
      prisma.ledger.count({
        where: { company: { id: user.id } },
      }) as Promise<number>,

      prisma.ledger.findMany({
        where: {
          company: {
            id: user.id,
          },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          balance: true,
          createdAt: true,
          sourceType: true,
          sourceId: true,
          company: { select: { username: true, email: true, role: true } },
          remark: true,
        },
        take: +limit,
        skip,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.json({
      meta: {
        total,
        page: +page,
        limit: +limit,
        lastPage: Math.ceil(+total / +limit),
        nextPage: +page + 1 > Math.ceil(+total / +limit) ? null : +page + 1,
        prevPage: +page - 1 < 1 ? null : +page - 1,
      },
      data: ledger,
    });
  } catch (err) {
    console.error("Transactions history error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
