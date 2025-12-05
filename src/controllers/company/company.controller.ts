import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { db, prisma } from "../../database/prismaClient";
import { Company, Prisma, Role, Status } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { handleETag } from "@game/utils/etagUtil";
import { roleHierarchy } from "@game/core/common/middleware/rbac.middleware";
import loggerInstance from "@game/core/common/logger/logger.service";

/**
 * Create a new user with hirarchy
 * @param req
 * @param res
 * @returns
 */
export const createUser = async (req: Request, res: Response) => {
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
  try {
    const creator = req.user;
    if (!creator) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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
    if (!canAssign(creator.role, role as Role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "You cannot create a user with equal or higher role",
      });
    }

    const existing = await db.findFirst<Company>(
      "company",
      { where: { OR: [{ username }, { email }] } },
      { ttl: 60 }
    );

    if (existing) {
      const message =
        existing.username === username
          ? "Username already taken"
          : "Email already registered";

      return res.status(StatusCodes.CONFLICT).json({
        message,
      });
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

/**
 * Get downline users by parent ID
 * @param req
 * @param res
 * @returns
 */
export const getDownline = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.q as string) || "";
    const sortBy = (req.query.sort as string) || "createdAt";

    const sortOrder =
      (req.query.order as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const offset = (page - 1) * limit;

    const hasSearch = search.trim() !== "";
    const searchQuery = hasSearch ? `%${search}%` : "%%";

    let status: Status =
      (req.query.status as string as Status & "ALL_STATUS") ||
      ("ACTIVE" as Status);

    if (status === "ALL_STATUS") {
      status = undefined as unknown as Status;
    }

    const validStatuses: Status[] = ["ACTIVE", "INACTIVE", "BLOCK", "DELETED"];

    if (status && !validStatuses.includes(status)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invalid status" });
    }

    let role: Role =
      (req.query.role as string as Role & "ALL") || ("ALL" as Role);

    if (role === "ALL") {
      role = undefined as unknown as Role;
    }

    const validRoles: Role[] = [
      "ADMIN",
      "DISTRIBUTOR",
      "SUB_DISTRIBUTOR",
      "STORE",
      "PLAYER",
    ];

    if (role && !validRoles.includes(role)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invalid role" });
    }

    // for prevent sql injection and safety
    const sortableColumns = [
      "username",
      "email",
      "role",
      "points",
      "isActive",
      "status",
      "createdAt",
      "updatedAt",
      "lastLoggedIn",
      "contactNumber",
    ];

    const validSortBy = sortableColumns.includes(sortBy) ? sortBy : "createdAt";

    // Build ORDER BY clause safely
    const orderByClause =
      sortOrder === "ASC"
        ? Prisma.sql`ORDER BY d.${Prisma.raw(`"${validSortBy}"`)} ASC NULLS LAST`
        : Prisma.sql`ORDER BY d.${Prisma.raw(`"${validSortBy}"`)} DESC NULLS LAST`;

    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
  WITH RECURSIVE descendants AS (
    SELECT 
      id, username, email, "contactNumber", status, role
    FROM companies
    WHERE id = ${user.id}

    UNION ALL

    SELECT 
      c.id, c.username, c.email, c."contactNumber", c.status, c.role
    FROM companies c
    INNER JOIN descendants d ON c."parentId" = d.id
  )
  SELECT COUNT(*) AS total
  FROM descendants
  WHERE id != ${user.id}
    AND (
      NOT ${hasSearch} OR
      username ILIKE ${searchQuery} OR
      email ILIKE ${searchQuery} OR
      "contactNumber" ILIKE ${searchQuery}
    )
    ${status ? Prisma.sql`AND status = ${status}::"Status"` : Prisma.sql``}
    ${role ? Prisma.sql`AND role = ${role}::"Role"` : Prisma.sql``};
`;
    const total = Number(countResult[0].total);

    const downline = await prisma.$queryRaw<any[]>`
  WITH RECURSIVE descendants AS (
    SELECT 
      id, username, role, points, "isActive",
      "contactNumber", "parentId", "createdAt",
      email, remarks, status, "rechargePerm",
      "withdrawPerm", "agentProtect", "lastLoggedIn",
      "updatedAt"
    FROM companies
    WHERE id = ${user.id}

    UNION ALL

    SELECT 
      c.id, c.username, c.role, c.points, c."isActive",
      c."contactNumber", c."parentId", c."createdAt",
      c.email, c.remarks, c.status, c."rechargePerm",
      c."withdrawPerm", c."agentProtect", c."lastLoggedIn",
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
    ) AS parent
  FROM descendants d
  LEFT JOIN companies p ON d."parentId" = p.id
  WHERE d.id != ${user.id}
    AND (
      NOT ${hasSearch} OR
      d.username ILIKE ${searchQuery} OR
      d.email ILIKE ${searchQuery} OR
      d."contactNumber" ILIKE ${searchQuery}
    )
    ${status ? Prisma.sql`AND d.status = ${status}::"Status"` : Prisma.sql``}
    ${role ? Prisma.sql`AND d.role = ${role}::"Role"` : Prisma.sql``}
  ${orderByClause}
  LIMIT ${limit} OFFSET ${offset};
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
        sortBy: validSortBy,
        sortOrder,
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

/**
 * Get my users
 *  @param req
 * @param res
 * @returns
 */
export const getMyUsers = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const countResult = (await db.count<Company>("company", {
      where: { parentId: user.id },
    })) as number;
    const users = await db.findMany<Company>("company", {
      where: { parentId: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        role: true,
        points: true,
        isActive: true,
        contactNumber: true,
        parent: {
          select: {
            username: true,
            role: true,
            contactNumber: true,
            email: true,
          },
        },
        createdAt: true,
        lastLoggedIn: true,
        remarks: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const latestUpdate = users.reduce(
      (max, item) => Math.max(max, new Date(item.updatedAt).getTime()),
      0
    );
    if (handleETag(req, res, { updatedAt: new Date(latestUpdate) })) return;

    res.json({
      meta: {
        page,
        limit,
        total: countResult,
        totalPages: Math.ceil(countResult / limit),
      },
      data: users,
      message: "Users fetched successfully",
    });

    return res.json({ data: users, message: "Users fetched successfully" });
  } catch (err) {
    loggerInstance.error(`Get downline error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

/**
 * Get user by id
 * @param req
 * @param res
 * @returns
 */
export const getUser = async (req: Request, res: Response) => {
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
          email: true,
          status: true,
          role: true,
          points: true,
          isActive: true,
          contactNumber: true,
          parent: {
            select: {
              username: true,
              role: true,
              contactNumber: true,
              email: true,
            },
          },
          createdAt: true,
          lastLoggedIn: true,
          remarks: true,
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
      data: targetUser,
    });
  } catch (err) {
    loggerInstance.error(`Get user error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

/**
 * Get me
 * @param req
 * @param res
 * @returns
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;

    if (!currentUser)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });

    const user = await db.findUnique<Company>(
      "company",
      {
        where: { id: currentUser.id },
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          role: true,
          points: true,
          isActive: true,
          contactNumber: true,
          parent: {
            select: {
              username: true,
              role: true,
              contactNumber: true,
              email: true,
            },
          },
          twoFactorEnabled: true,
          createdAt: true,
          lastLoggedIn: true,
          remarks: true,
        },
      },
      {
        useCache: false,
      }
    );

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }

    return res.json({
      message: "User fetched successfully",
      data: user,
    });
  } catch (err) {
    loggerInstance.error(`Get me error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

/**
 * Update user
 * @param req
 * @param res
 * @returns
 */
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

    if (!canAssign(currentUser.role, target.role)) {
      return res.status(403).json({
        message: "You don't have permission to update this user",
      });
    }

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

/**
 * Update user profile
 * @param req
 * @param res
 * @returns
 */
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;
    if (!currentUser)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });

    const target = await db.findUnique<Company>(
      "company",
      { where: { id: currentUser.id } },
      { ttl: 60 }
    );

    if (!target) return res.status(404).json({ message: "User not found" });

    const { ...safeUpdates } = req.body;

    const updated = (await db.update<Company>("company", {
      where: { id: currentUser.id },
      data: safeUpdates,
    })) as Company;

    return res.json({
      message: "User updated successfully",
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        contactNumber: updated.contactNumber,
        role: updated.role,
        points: updated?.points || 0,
      },
    });
  } catch (err) {
    loggerInstance.error(`Update user error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

/**
 * Change Password
 * @param req
 * @param res
 * @returns
 */
export const changePassword = async (req: Request, res: Response) => {
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
      return res.status(400).json({ message: "Invalid old password" });

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

/**
 * Toggle user status
 * @param req
 * @param res
 * @returns
 */
export const toggleUserStatus = async (req: Request, res: Response) => {
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

/**
 * Update user coin
 * @param req
 * @param res
 * @returns
 */
export const updateUserCoin = async (req: Request, res: Response) => {
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

/**
 * Delete user
 * @param req
 * @param res
 * @returns
 */
export const deletedUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(id);

    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const target = await db.findUnique<Company>(
      "company",
      { where: { id } },
      { ttl: 60 }
    );
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.role === Role.ADMIN)
      return res.status(403).json({ message: "Cannot delete admin" });

    let allowed = false;

    if (currentUser.role === Role.ADMIN) {
      allowed = true;
    } else {
      allowed = await isInMyHierarchy(currentUser.id, id);
    }

    if (!allowed) return res.status(403).json({ message: "Access denied" });

    await db.update("company", {
      where: { id },
      data: { deletedAt: new Date(), status: "DELETED" },
    });
    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    loggerInstance.error(`Delete user error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

/**
 * Get users by parent id
 * @param req
 * @param res
 * @returns
 */
export const getUsersByParentId = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    let hasAccess = false;

    if (currentUser.role === "ADMIN") {
      hasAccess = true;
    } else {
      hasAccess = await isInMyHierarchy(currentUser.id, req.params.parentId);
    }

    if (!hasAccess) return res.status(403).json({ message: "Access denied" });

    const { parentId } = req.params;

    const users = await db.findMany<Company>(
      "company",
      { where: { parentId } },
      { ttl: 60 }
    );

    return res.json(users);
  } catch (err) {
    loggerInstance.error(`Get users by parent id error:, ${err}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

// Helper functions

const assignMap: Record<Role, Role[]> = {
  [Role.ADMIN]: [
    Role.DISTRIBUTOR,
    Role.SUB_DISTRIBUTOR,
    Role.STORE,
    Role.PLAYER,
  ],
  [Role.DISTRIBUTOR]: [Role.SUB_DISTRIBUTOR],
  [Role.SUB_DISTRIBUTOR]: [Role.STORE],
  [Role.STORE]: [Role.PLAYER],
  [Role.PLAYER]: [],
};

export async function isInMyHierarchy(
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

export const canAssign = (senderRole: Role, receiverRole: Role): boolean => {
  return assignMap[senderRole].includes(receiverRole);
};
