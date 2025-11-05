import { Request, Response, NextFunction } from "express";
import { db } from "../../database/prismaClient";
import { verifyToken } from "@game/utils/jwt";
import { Company, Role } from "@prisma/client";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    type: string;
    role: Role;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = verifyToken(token, "access");

    const company = await db.findUnique<Company>(
      "company",
      {
        where: { id: decoded.id },
      },
      { ttl: 30 }
    );

    if (!company) {
      return res
        .status(401)
        .json({ message: "Invalid token - company not found" });
    }

    req.user = {
      id: company.id,
      username: company.username,
      role: company.role,
    } as any;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  next();
};

// Optional: Rate limiting middleware using your Redis setup
export const rateLimit = (
  maxRequests: number = 100,
  windowMs: number = 900000
) => {
  const requests = new Map();

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!ip) {
      return next();
    }

    // Clean old entries
    requests.forEach((timestamps, key) => {
      const validTimestamps = timestamps.filter(
        (time: number) => time > windowStart
      );
      if (validTimestamps.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, validTimestamps);
      }
    });

    const userRequests = requests.get(ip) || [];
    const recentRequests = userRequests.filter(
      (time: number) => time > windowStart
    );

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests, please try again later",
      });
    }

    recentRequests.push(now);
    requests.set(ip, recentRequests);

    next();
  };
};
