import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { db, prisma } from "../database/prismaClient";
import { Company, Prisma, Role } from "@prisma/client";
import { ChangePasswordBody } from "@game/types/company.type";
import { roleHierarchy } from "@game/common/middleware/rbac.middleware";
import { StatusCodes } from "http-status-codes";
import loggerInstance from "@game/common/logger/logger.service";
import { handleETag } from "@game/utils/etagUtil";

// check if targetId is in my hierarchy
async function isInMyHierarchy(
  myId: string,
  targetId: string
): Promise<boolean> {
  if (myId === targetId) return true;

  const children = (await db.findMany<Company>(
    "company",
    { where: { parentId: myId } },
    { ttl: 60 }
  )) as Company[];

  for (const c of children) {
    if (await isInMyHierarchy(c.id, targetId)) return true;
  }
  return false;
}

export const createUser = async (
  req: Request<unknown, unknown, any>,
  res: Response
) => {
  try {
    const creator = req.user as Company;
    if (!creator) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      username,
      password,
      role,
      contactNumber,
      remarks,
      rechargePerm,
      withdrawPerm,
      agentProtect,
      email,
      status,
      lastLoggedIn,
    } = req.body;

    if (!username || !password || !role) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Username, password, and role are required" });
    }

    const creatorLevel = roleHierarchy[creator.role];
    const newUserLevel = roleHierarchy[role as Role];

    if (newUserLevel >= creatorLevel) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "You cannot create a user with equal or higher role",
      });
    }

    const existing = await db.findUnique<Company>(
      "company",
      { where: { username } },
      { ttl: 60 }
    );
    if (existing) {
      return res
        .status(StatusCodes.CONFLICT)
        .json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = (await db.create<Company>("company", {
      data: {
        username,
        password: hashedPassword,
        role,
        parentId: creator.id,
        contactNumber,
        remarks,
        rechargePerm: rechargePerm ?? false,
        withdrawPerm: withdrawPerm ?? false,
        agentProtect: agentProtect ?? false,
        points: 0,
        email,
        status,
        lastLoggedIn: lastLoggedIn ? new Date(lastLoggedIn) : null,
      },
    })) as Company;

    return res.status(StatusCodes.CREATED).json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        parentId: newUser.parentId,
        email: newUser.email,
        status: newUser.status,
        lastLoggedIn: newUser.lastLoggedIn,
      },
    });
  } catch (err) {
    loggerInstance.error(`Create user error:"${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

export const getDownline = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // First, get the total count
    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id
        FROM companies
        WHERE id = ${user.id}
        
        UNION ALL
        
        SELECT c.id
        FROM companies c
        INNER JOIN descendants d ON c."parentId" = d.id
      )
      SELECT COUNT(*) AS total
      FROM descendants
      WHERE id != ${user.id}
    `;

    const total = Number(countResult[0].total);

    // Get paginated results with parent data
    const downline = await prisma.$queryRaw<any[]>`
      WITH RECURSIVE descendants AS (
        SELECT 
          id, 
          username, 
          role, 
          points, 
          "isActive", 
          "contactNumber", 
          "parentId", 
          "createdAt",
          email,
          remarks,
          status,
          "rechargePerm",
          "withdrawPerm",
          "agentProtect",
          "lastLoggedIn",
          "updatedAt"
        FROM companies
        WHERE id = ${user.id}
        
        UNION ALL
        
        SELECT 
          c.id, 
          c.username, 
          c.role, 
          c.points, 
          c."isActive", 
          c."contactNumber", 
          c."parentId", 
          c."createdAt",
          c.email,
          c.remarks,
          c.status,
          c."rechargePerm",
          c."withdrawPerm",
          c."agentProtect",
          c."lastLoggedIn",
          c."updatedAt"
        FROM companies c
        INNER JOIN descendants d ON c."parentId" = d.id
      )
      SELECT 
        d.*,
        jsonb_build_object(
          'id', p.id,
          'username', p.username,
          'role', p.role,
          'contactNumber', p."contactNumber",
          'email', p.email
        ) as parent
      FROM descendants d
      LEFT JOIN companies p ON d."parentId" = p.id
      WHERE d.id != ${user.id}
      ORDER BY d."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const latestUpdate = downline.reduce(
      (max, item) => Math.max(max, new Date(item.updatedAt).getTime()),
      0
    );
    if (handleETag(req, res, { updatedAt: new Date(latestUpdate) })) return;

    return res.json({
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: downline,
      message: "Downline fetched successfully",
    });
  } catch (err) {
    loggerInstance.error(`Get downline error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

export const getDownlineDashboard = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );

    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setMilliseconds(-1);

    const last7Days = new Date(todayStart);
    last7Days.setDate(last7Days.getDate() - 7);

    const last30Days = new Date(todayStart);
    last30Days.setDate(last30Days.getDate() - 30);

    const thisMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0
    );

    // Get all downline IDs using recursive CTE
    const downlineIds = await prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id
        FROM companies
        WHERE id = ${user.id}
        
        UNION ALL
        
        SELECT c.id
        FROM companies c
        INNER JOIN descendants d ON c."parentId" = d.id
      )
      SELECT id
      FROM descendants
      WHERE id != ${user.id}
    `;

    const downlineIdList = downlineIds.map((d) => d.id);

    if (downlineIdList.length === 0) {
      const emptyResponse = {
        data: {
          overview: {
            totalDownline: 0,
            totalPlayers: 0,
            totalAgents: 0,
            activeUsers: 0,
            inactiveUsers: 0,
            usersWithRechargePermission: 0,
            usersWithWithdrawPermission: 0,
            protectedAgents: 0,
          },
          registrations: {
            today: 0,
            yesterday: 0,
            last7Days: 0,
            last30Days: 0,
            thisMonth: 0,
          },
          activity: {
            activeToday: 0,
            activeYesterday: 0,
            activeLast7Days: 0,
            activeLast30Days: 0,
            neverLoggedIn: 0,
          },
          userActivity: {
            totalActivities: 0,
            activitiesToday: 0,
            activitiesYesterday: 0,
            activitiesLast7Days: 0,
            activitiesLast30Days: 0,
            activitiesThisMonth: 0,
            uniqueDevicesToday: 0,
            uniqueIPsToday: 0,
          },
          points: {
            totalPoints: 0,
            averagePoints: 0,
            maxPoints: 0,
            minPoints: 0,
            usersWithPoints: 0,
          },
          roleBreakdown: [],
          statusBreakdown: [],
        },
      };

      if (handleETag(req, res, { updatedAt: new Date(0) })) return;

      return res.json({
        ...emptyResponse,
        message: "Dashboard data fetched successfully",
      });
    }

    const latestUpdateResult = await db.findUnique<Company>("company", {
      where: {
        id: { in: downlineIdList },
      },
      orderBy: [{ updatedAt: "desc" }],
      limit: 1,
      select: ["updatedAt"],
    });

    const latestUpdate = latestUpdateResult?.updatedAt || new Date();

    if (handleETag(req, res, { updatedAt: latestUpdate })) return;

    const totalDownline = downlineIdList.length;

    // Role counts
    const roleCounts = await prisma.company.groupBy({
      by: ["role"],
      where: {
        id: { in: downlineIdList },
      },
      _count: {
        id: true,
      },
    });

    const totalPlayers =
      roleCounts.find((r) => r.role === "PLAYER")?._count.id || 0;
    const totalAgents = roleCounts
      .filter((r) => r.role !== "PLAYER")
      .reduce((sum, r) => sum + r._count.id, 0);

    // Status counts
    const statusCounts = await prisma.company.groupBy({
      by: ["status", "isActive"],
      where: {
        id: { in: downlineIdList },
      },
      _count: {
        id: true,
      },
    });

    const activeUsers = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        isActive: true,
        status: "ACTIVE",
      },
    });

    const inactiveUsers = totalDownline - activeUsers;

    // Permission counts
    const usersWithRechargePermission = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        rechargePerm: true,
      },
    });

    const usersWithWithdrawPermission = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        withdrawPerm: true,
      },
    });

    const protectedAgents = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        agentProtect: true,
      },
    });

    // REGISTRATION SECTION
    const registrationsToday = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        createdAt: { gte: todayStart },
      },
    });

    const registrationsYesterday = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        createdAt: { gte: yesterday, lt: todayStart },
      },
    });

    const registrationsLast7Days = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        createdAt: { gte: last7Days },
      },
    });

    const registrationsLast30Days = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        createdAt: { gte: last30Days },
      },
    });

    const registrationsThisMonth = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        createdAt: { gte: thisMonthStart },
      },
    });

    //  ACTIVITY SECTION (Based on lastLoggedIn)
    const activeToday = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        lastLoggedIn: { gte: todayStart },
      },
    });

    const activeYesterday = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        lastLoggedIn: { gte: yesterday, lt: todayStart },
      },
    });

    const activeLast7Days = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        lastLoggedIn: { gte: last7Days },
      },
    });

    const activeLast30Days = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        lastLoggedIn: { gte: last30Days },
      },
    });

    const neverLoggedIn = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        lastLoggedIn: null,
      },
    });

    // USER ACTIVITY SECTION (CompanyActivity tracking)
    const totalActivities = await prisma.companyActivity.count({
      where: {
        companyId: { in: downlineIdList },
      },
    });

    const activitiesToday = await prisma.companyActivity.count({
      where: {
        companyId: { in: downlineIdList },
        createdAt: { gte: todayStart },
      },
    });

    const activitiesYesterday = await prisma.companyActivity.count({
      where: {
        companyId: { in: downlineIdList },
        createdAt: { gte: yesterday, lt: todayStart },
      },
    });

    const activitiesLast7Days = await prisma.companyActivity.count({
      where: {
        companyId: { in: downlineIdList },
        createdAt: { gte: last7Days },
      },
    });

    const activitiesLast30Days = await prisma.companyActivity.count({
      where: {
        companyId: { in: downlineIdList },
        createdAt: { gte: last30Days },
      },
    });

    const activitiesThisMonth = await prisma.companyActivity.count({
      where: {
        companyId: { in: downlineIdList },
        createdAt: { gte: thisMonthStart },
      },
    });

    // Unique devices and IPs today
    const uniqueDevicesToday = await prisma.companyActivity.groupBy({
      by: ["device"],
      where: {
        companyId: { in: downlineIdList },
        createdAt: { gte: todayStart },
        device: { not: Prisma.JsonNull },
      },
      _count: {
        id: true,
      },
    });

    const uniqueIPsToday = await prisma.companyActivity.groupBy({
      by: ["ip"],
      where: {
        companyId: { in: downlineIdList },
        createdAt: { gte: todayStart },
        ip: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // POINTS SECTION
    const pointsStats = await prisma.company.aggregate({
      where: {
        id: { in: downlineIdList },
      },
      _sum: { points: true },
      _avg: { points: true },
      _max: { points: true },
      _min: { points: true },
    });

    const usersWithPoints = await prisma.company.count({
      where: {
        id: { in: downlineIdList },
        points: { gt: 0 },
      },
    });

    // Format role breakdown
    const roleBreakdown = roleCounts.map((r) => ({
      role: r.role,
      count: r._count.id,
      percentage: ((r._count.id / totalDownline) * 100).toFixed(2),
    }));

    // Format status breakdown
    const statusBreakdown = statusCounts.map((s) => ({
      status: s.status,
      isActive: s.isActive,
      count: s._count.id,
      percentage: ((s._count.id / totalDownline) * 100).toFixed(2),
    }));

    return res.json({
      data: {
        overview: {
          totalDownline,
          totalPlayers,
          totalAgents,
          activeUsers,
          inactiveUsers,
          usersWithRechargePermission,
          usersWithWithdrawPermission,
          protectedAgents,
        },
        registrations: {
          today: registrationsToday,
          yesterday: registrationsYesterday,
          last7Days: registrationsLast7Days,
          last30Days: registrationsLast30Days,
          thisMonth: registrationsThisMonth,
        },
        activity: {
          activeToday,
          activeYesterday,
          activeLast7Days,
          activeLast30Days,
          neverLoggedIn,
        },
        userActivity: {
          totalActivities,
          activitiesToday,
          activitiesYesterday,
          activitiesLast7Days,
          activitiesLast30Days,
          activitiesThisMonth,
          uniqueDevicesToday: uniqueDevicesToday.length,
          uniqueIPsToday: uniqueIPsToday.length,
        },
        points: {
          totalPoints: pointsStats._sum.points || 0,
          averagePoints: Math.round(pointsStats._avg.points || 0),
          maxPoints: pointsStats._max.points || 0,
          minPoints: pointsStats._min.points || 0,
          usersWithPoints,
        },
        roleBreakdown,
        statusBreakdown,
      },
      message: "Dashboard data fetched successfully",
    });
  } catch (err) {
    console.error("Get downline dashboard error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUser = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const currentUser = req.user;
    if (!currentUser)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });

    const { id } = req.params;

    const targetUser = await db.findUnique<Company>(
      "company",
      {
        where: { id },
        select: {
          id: true,
          username: true,
          role: true,
          points: true,
          isActive: true,
          contactNumber: true,
          parentId: true,
        },
      },
      { ttl: 60 }
    );

    if (!targetUser) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }

    if (handleETag(req, res, targetUser)) return;

    const allowed =
      (await isInMyHierarchy(currentUser.id, id)) ||
      currentUser.role === "ADMIN";

    if (!allowed) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Access denied" });
    }

    return res.json({
      message: "User fetched successfully",
      user: targetUser,
    });
  } catch (err) {
    loggerInstance.error(`Get user error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;
    if (!currentUser)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });

    const { id } = req.params;

    if (id === currentUser.id) {
      res.status(StatusCodes.FORBIDDEN).json({
        message: "Use change-password endpoint to update your own data",
      });
    }

    const target = await db.findUnique<Company>(
      "company",
      { where: { id } },
      { ttl: 60 }
    );
    if (!target) return res.status(404).json({ message: "User not found" });

    const allowed =
      (await isInMyHierarchy(currentUser.id, id)) ||
      currentUser.role === "ADMIN";
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const { ...safeUpdates } = req.body;

    const updated = (await db.update<Company>("company", {
      where: { id },
      data: safeUpdates,
    })) as Company;

    return res.json({
      message: "User updated successfully",
      user: {
        id: updated.id,
        contactNumber: updated.contactNumber,
        remarks: updated.remarks,
        rechargePerm: updated.rechargePerm,
        withdrawPerm: updated.withdrawPerm,
        agentProtect: updated.agentProtect,
        isActive: updated.isActive,
      },
    });
  } catch (err) {
    loggerInstance.error(`Update user error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

export const changePassword = async (
  req: Request<unknown, unknown, ChangePasswordBody>,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Old and new password are required" });
    }

    const company = (await db.findUnique<Company>(
      "company",
      { where: { id: user.id } },
      { ttl: 60 }
    )) as Company | null;

    if (!company) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(oldPassword, company.password);
    if (!valid)
      return res.status(401).json({ message: "Invalid old password" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.update<Company>("company", {
      where: { id: user.id },
      data: { password: hashed },
    });

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    loggerInstance.error(`Change password error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

export const toggleUserStatus = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const currentUser = req.user;
    if (!currentUser)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized Access!" });

    const { id } = req.params;
    const { status } = req.body;

    const statusCheck = status === "ACTIVE";

    const target = (await db.findUnique<Company>(
      "company",
      { where: { id } },
      { ttl: 60 }
    )) as Company | null;

    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === "ADMIN")
      return res.status(403).json({ message: "Cannot deactivate admin" });

    const allowed =
      (await isInMyHierarchy(currentUser.id, id)) ||
      currentUser.role === "ADMIN";
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const updated = (await db.update<Company>("company", {
      where: { id },
      data: { isActive: statusCheck ? true : false, status: status },
    })) as Company;

    return res.json({
      message: `User ${updated.isActive ? "activated" : "deactivated"} successfully`,
      isActive: updated.isActive,
    });
  } catch (err) {
    loggerInstance.error(`Toggle status error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

export const updateUserCoin = async (
  req: Request<unknown, unknown, { id: string; coin: number }>,
  res: Response
) => {
  try {
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const { id, coin } = req.body;
    let target = null;
    if (currentUser.role === "ADMIN") {
      target = (await db.findUnique<Company>(
        "company",
        { where: { id, parentId: currentUser.id } },
        { ttl: 60 }
      )) as Company | null;
    } else {
      target = (await db.findUnique<Company>(
        "company",
        { where: { id, parentId: currentUser.id } },
        { ttl: 60 }
      )) as Company | null;
    }

    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.role === "ADMIN")
      return res.status(403).json({ message: "Cannot deactivate admin" });

    const allowed =
      (await isInMyHierarchy(currentUser.id, id)) ||
      currentUser.role === "ADMIN";
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const updated = (await db.update<Company>("company", {
      where: { id },
      data: { coin },
    })) as Company;

    return res.json({
      message: `User ${updated.isActive ? "activated" : "deactivated"} successfully`,
      isActive: updated.isActive,
    });
  } catch (err) {
    console.error("Toggle status error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
