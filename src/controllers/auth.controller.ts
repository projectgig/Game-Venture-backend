import { Request, Response } from "express";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../utils/jwt";
import { db } from "../database/prismaClient";
import { Company, CompanyActivity } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import loggerInstance from "@game/common/logger/logger.service";

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
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      token: {
        accessToken,
        refreshToken,
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

    return res.json({
      accessToken,
      message: "Access token refreshed successfully",
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
