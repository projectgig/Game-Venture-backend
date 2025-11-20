import { Request, Response } from "express";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../utils/jwt";
import { db, prisma } from "../database/prismaClient";
import { Company, CompanyActivity } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import loggerInstance from "@game/common/logger/logger.service";
import {
  disable2FASchema,
  enable2FASchema,
  recoveryRequestSchema,
  verify2FASchema,
} from "@game/validation/auth.schema";
import { TwoFactorService } from "@game/services/twofa.service";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import { encrypt } from "@game/lib/crypto";

// const loginLimiter = rateLimit({
//   windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
//   max: Number(process.env.RATE_LIMIT_MAX) || 5,
//   standardHeaders: true,
//   legacyHeaders: false,
//   store: new MemoryStore(),
// });

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password, email, device, location } = req.body;

    const hasUsernameOrEmail = username || email;

    if (!hasUsernameOrEmail || !password) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Username and password are required" });
    }

    const company: Company | null = (await db.findFirst<Company>(
      "company",
      {
        where: {
          OR: [username ? { username } : {}, email ? { email } : {}],
        },
      },
      { ttl: 60 }
    )) as Company | null;

    if (!company) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, company.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const activity = (await db.create<CompanyActivity>("companyActivity", {
      data: {
        companyId: company.id,
        ip: req.ip,
        ...(device && { device }),
        ...(location && { location }),
      },
    })) as CompanyActivity;

    await db.update<Company>("company", {
      where: { id: company.id },
      data: {
        lastLoggedIn: activity.createdAt,
      },
    });

    if (company.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { sub: company.id },
        process.env.JWT_2FA_SECRET!,
        { expiresIn: "5m", issuer: "Venture", audience: "2fa" }
      );

      console.log("Sign secret:", process.env.JWT_2FA_SECRET);

      return res.status(StatusCodes.OK).json({
        message: "2FA verification required",
        requires2FA: true,
        tempToken,
      });
    }

    const accessToken = generateAccessToken({
      id: company.id,
      username: company.username,
      role: company.role,
    });

    const refreshToken = generateRefreshToken({
      id: company.id,
      username: company.username,
      role: company.role,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh-token",
    });

    res.json({
      message: "Login successful",
      token: {
        accessToken,
      },
      requires2FA: false,
      company: {
        id: company.id,
        username: company.username,
        email: company.email,
        points: company.points,
        contactNumber: company.contactNumber,
        role: company.role,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "No refresh token provided" });
    }

    const decoded = verifyToken(token, "refresh") as {
      id: string;
      username: string;
    };
    if (!decoded) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid refresh token" });
    }

    const company = (await db.findUnique(
      "company",
      { where: { id: decoded.id } },
      { ttl: 60 }
    )) as Company | null;

    if (!company || !company.isActive) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "User no longer valid" });
    }

    const accessToken = generateAccessToken({
      id: company.id,
      username: company.username,
      role: company.role,
    });

    const refreshToken = generateRefreshToken({
      id: company.id,
      username: company.username,
      role: company.role,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh-token",
    });

    return res.json({
      token: {
        accessToken,
      },
      message: "Successfully refreshed token.",
    });
  } catch (error) {
    loggerInstance.error(`Refresh token error:, ${error}`);
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid or expired refresh token" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("refreshToken");
    return res.json({ message: "Logout successful" });
  } catch (error) {
    loggerInstance.error(`Logout error:, ${error}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

export async function verify2FA(req: Request, res: Response) {
  const { token, backupCode, tempToken } = verify2FASchema.parse(
    req.body
  ) as any;
  console.log("tempToken:", tempToken);

  if (!tempToken) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "tempToken missing" });
  }

  if (!token && !backupCode) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "token or backupCode missing" });
  }

  console.log("Verify secret:", process.env.JWT_2FA_SECRET);

  let payload: any;
  try {
    payload = jwt.verify(tempToken, process.env.JWT_2FA_SECRET!, {
      audience: "2fa",
      issuer: "Venture",
    });
  } catch {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid or expired 2FA session" });
  }

  const company = await prisma.company.findUnique({
    where: { id: payload.sub },
  });

  if (!company) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Company not found" });
  }

  try {
    if (backupCode) {
      await TwoFactorService.verifyBackupCode(company.id, backupCode);
    } else {
      await TwoFactorService.verifyToken(company.id, token);
    }
  } catch (err: any) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
  }

  const accessToken = generateAccessToken({
    id: company.id,
    username: company.username,
    role: company.role,
  });

  const refreshToken = generateRefreshToken({
    id: company.id,
    username: company.username,
    role: company.role,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth/refresh-token",
  });

  await prisma.auditLog.create({
    data: {
      actorId: company.id,
      action: "2FA_LOGIN_SUCCESS",
      details: { ip: req.ip },
    },
  });

  return res.status(StatusCodes.OK).json({
    message: "2FA verification successful",
    token: {
      accessToken,
    },
    company: {
      id: company.id,
      username: company.username,
      email: company.email,
      points: company.points,
      contactNumber: company.contactNumber,
      role: company.role,
    },
  });
}

export async function setup2FA(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const { secret, qr } = await TwoFactorService.generateSecret(req.user.id);

  res.json({ secret, qr });
}

export async function enable2FA(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const { token } = enable2FASchema.parse(req.body);
  const { backupCodes } = await TwoFactorService.verifyAndEnable(
    req.user.id,
    token
  );

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: "2FA_ENABLED",
      details: { method: "APP" },
    },
  });

  res.json({ backupCodes });
}

export async function disable2FA(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const body = disable2FASchema.parse(req.body);
  await TwoFactorService.disable(req.user.id, body.token, body.backupCode);

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: "2FA_DISABLED",
    },
  });

  res.json({ message: "2FA disabled" });
}

export async function getBackupCodes(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const codes = await TwoFactorService.listBackupCodes(req.user.id);
  res.json({ remaining: codes.length });
}

export async function requestRecovery(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const { reason } = recoveryRequestSchema.parse(req.body);

  const existing = await prisma.twoFactorRecovery.findFirst({
    where: { companyId: req.user.id, status: "PENDING" },
  });
  if (existing)
    return res.status(429).json({ error: "Pending request exists" });

  const token = speakeasy.generateSecret({ length: 20 }).base32;
  const tokenHash = await encrypt(token);

  await prisma.twoFactorRecovery.create({
    data: {
      companyId: req.user.id,
      tokenHash,
      status: "PENDING",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: "2FA_RECOVERY_REQUESTED",
      details: { reason },
    },
  });

  res.json({ message: "Recovery requested. Admin will review." });
}

export async function approveRecovery(req: Request, res: Response) {
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({ error: "Admin only" });

  const { recoveryId } = req.params;
  const recovery = await prisma.twoFactorRecovery.findUnique({
    where: { id: recoveryId },
  });
  if (!recovery || recovery.status !== "PENDING")
    return res.status(400).json({ error: "Invalid request" });

  await prisma.$transaction([
    prisma.twoFactorRecovery.update({
      where: { id: recoveryId },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
    prisma.company.update({
      where: { id: recovery.companyId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorMethod: null,
      },
    }),
    prisma.backupCode.deleteMany({ where: { companyId: recovery.companyId } }),
  ]);

  res.json({ message: "Recovery approved, 2FA disabled" });
}
