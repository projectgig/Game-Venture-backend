// import { Router, Response } from "express";

// import { AuthRequest } from "../common/middleware/auth.middleware";
// import { db } from "../database/prismaClient";
// import bcrypt from "bcryptjs";
// import { Role } from "@prisma/client";

// const router = Router();

// interface Company {
//   id: string;
//   username: string;
//   role: Role;
//   parentId: string | null;
//   points: number;
//   isActive: boolean;
//   rechargePerm: boolean;
//   withdrawPerm: boolean;
//   agentProtect: boolean;
// }

// const canCreateRole = (creatorRole: Role, newRole: Role): boolean => {
//   const hierarchy: Record<Role, Role[]> = {
//     ADMIN: ["SUB_DISTRIBUTOR"],
//     DISTRIBUTOR: ["DISTRIBUTOR"],
//     SUB_DISTRIBUTOR: ["STORE"],
//     STORE: ["PLAYER"],
//     PLAYER: [],
//   };
//   return hierarchy[creatorRole].includes(newRole);
// };

// router.post("/", async (req: AuthRequest, res: Response) => {
//   try {
//     const {
//       username,
//       password,
//       confirmPassword,
//       contactNumber,
//       role: newRoleString,
//       rechargePermission = false,
//       withdrawPermission = false,
//       agentProtectPermission = false,
//       rechargeBalance = 0,
//     } = req.body;

//     const parentCompany = req.company!;
//     const newRole = newRoleString as Role;

//     if (!username || !password || password !== confirmPassword || !newRole) {
//       return res
//         .status(400)
//         .json({ message: "Invalid or missing required fields" });
//     }

//     if (!["ADMIN", "SUB_DISTRIBUTOR", "STORE", "PLAYER"].includes(newRole)) {
//       return res.status(400).json({ message: "Invalid role" });
//     }

//     if (!canCreateRole(parentCompany.role, newRole)) {
//       return res.status(403).json({
//         message: `Unauthorized: ${parentCompany.role} cannot create ${newRole}`,
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newCompany = (await db.create("company", {
//       data: {
//         username,
//         password: hashedPassword,
//         contactNumber: contactNumber || null,
//         role: newRole,
//         parentId: parentCompany.id,
//         points: parseFloat(rechargeBalance) || 0,
//         rechargePerm: rechargePermission,
//         withdrawPerm: withdrawPermission,
//         agentProtect: agentProtectPermission,
//         isActive: true,
//       },
//       select: {
//         id: true,
//         username: true,
//         role: true,
//         parentId: true,
//         points: true,
//         isActive: true,
//       },
//     })) as Company;

//     return res.status(201).json({
//       message: "User created successfully",
//       user: newCompany,
//     });
//   } catch (error: any) {
//     if (error.code === "P2002") {
//       return res.status(409).json({ message: "Username already exists" });
//     }
//     console.error("Add user error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// });

// router.put("/:id/password-reset", async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { newPassword, confirmNewPassword } = req.body;
//     const parentCompany = req.company!;

//     if (!newPassword || newPassword !== confirmNewPassword) {
//       return res
//         .status(400)
//         .json({ message: "Passwords do not match or are missing" });
//     }

//     const targetCompany = (await db.findUnique(
//       "company",
//       {
//         where: { id },
//       },
//       { ttl: 30 }
//     )) as Company | null;

//     if (!targetCompany || targetCompany.parentId !== parentCompany.id) {
//       return res
//         .status(403)
//         .json({ message: "Unauthorized or user not found" });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     await db.update("company", {
//       where: { id },
//       data: { password: hashedPassword },
//     });

//     return res.json({ message: "Password reset successfully" });
//   } catch (error) {
//     console.error("Password reset error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// });

// router.put("/:id/status", async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const parentCompany = req.company!;
//     const { isActive, rechargePerm, withdrawPerm, agentProtect } = req.body;

//     const targetCompany = (await db.findUnique(
//       "company",
//       {
//         where: { id },
//       },
//       { ttl: 30 }
//     )) as Company | null;

//     if (!targetCompany || targetCompany.parentId !== parentCompany.id) {
//       return res
//         .status(403)
//         .json({ message: "Unauthorized or user not found" });
//     }

//     const updateData: Partial<Company> = {};
//     if (typeof isActive === "boolean") updateData.isActive = isActive;
//     if (typeof rechargePerm === "boolean")
//       updateData.rechargePerm = rechargePerm;
//     if (typeof withdrawPerm === "boolean")
//       updateData.withdrawPerm = withdrawPerm;
//     if (typeof agentProtect === "boolean")
//       updateData.agentProtect = agentProtect;

//     if (Object.keys(updateData).length === 0) {
//       return res
//         .status(400)
//         .json({ message: "No valid fields provided for update" });
//     }

//     const updatedCompany = (await db.update("company", {
//       where: { id },
//       data: updateData,
//       select: {
//         id: true,
//         username: true,
//         isActive: true,
//         rechargePerm: true,
//         withdrawPerm: true,
//         agentProtect: true,
//       },
//     })) as Company;

//     return res.json({
//       message: "User status/permissions updated successfully",
//       user: updatedCompany,
//     });
//   } catch (error) {
//     console.error("Update status/permission error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// });

// export default router;
