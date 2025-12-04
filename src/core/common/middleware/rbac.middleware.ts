import { Response, NextFunction } from "express";
import { Company, Role } from "@prisma/client";
import { db } from "@game/database/prismaClient";
import { AuthRequest } from "./auth.middleware";

/**
 * Require one of the allowed roles
 */

export const requireRole = (...allowedRoles: Role[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const company = req.user;
      if (!company) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!allowedRoles.includes(company.role)) {
        return res.status(403).json({
          message: "Insufficient permissions",
          required: allowedRoles,
          current: company.role,
        });
      }

      next();
    } catch (err) {
      console.error("RBAC requireRole error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

/**
 * Require that the requester is the **parent/creator** of the target user (by param)
 */
export const requireCreatorOfParam = (paramName: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const company = req.user;
      if (!company) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const targetId = req.params[paramName];
      if (!targetId) {
        return res
          .status(400)
          .json({ message: `Param ${paramName} is required` });
      }

      // ADMIN bypass
      if (company.role === "ADMIN") {
        return next();
      }

      const isInMyDownline = async (
        rootId: string,
        targetId: string
      ): Promise<boolean> => {
        if (rootId === targetId) return true;

        const children = (await db.findMany(
          "company",
          { where: { parentId: rootId }, select: { id: true } },
          { ttl: 60 }
        )) as Company[];

        for (const child of children) {
          if (await isInMyDownline(child.id, targetId)) return true;
        }
        return false;
      };

      const allowed = await isInMyDownline(company.id, targetId);
      if (!allowed) {
        return res
          .status(403)
          .json({ message: "You can only manage your own downline" });
      }

      next();
    } catch (err) {
      console.error("RBAC requireCreatorOfParam error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

/**
 * Require that requester is parent of a **body field** (e.g., { playerId: 'xxx' })
 */
export const requireCreatorOfBody = (fieldName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const company = req.user;
      if (!company) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const targetId = req.body[fieldName];
      if (!targetId) {
        return res
          .status(400)
          .json({ message: `${fieldName} is required in body` });
      }

      if (company.role === "ADMIN") return next();

      const isInMyDownline = async (
        rootId: string,
        targetId: string
      ): Promise<boolean> => {
        if (rootId === targetId) return true;
        const children = await db.findMany<Company>(
          "company",
          { where: { parentId: rootId }, select: { id: true } },
          { ttl: 60 }
        );

        for (const child of children) {
          if (await isInMyDownline(child.id, targetId)) return true;
        }
        return false;
      };

      const allowed = await isInMyDownline(company.id, targetId);
      if (!allowed) {
        return res
          .status(403)
          .json({ message: "You can only manage your own downline" });
      }

      next();
    } catch (err) {
      console.error("RBAC requireCreatorOfBody error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

export const roleHierarchy: Record<Role, number> = {
  ADMIN: 5,
  DISTRIBUTOR: 4,
  SUB_DISTRIBUTOR: 3,
  STORE: 2,
  PLAYER: 1,
};
