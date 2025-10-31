import { Company, Role } from "@prisma/client";

type CreateUserBody = {
  username: string;
  email?: string;
  password: string;
  role: Role;
  points: number;
  contactNumber?: string;
  remarks?: string;
  rechargePerm?: boolean;
  withdrawPerm?: boolean;
  agentProtect?: boolean;
  isActive?: boolean;
  parentId?: string;
  status?: string;
  lastLoggedIn?: Date;
};

type UpdateUserBody = Partial<
  Omit<
    Company,
    | "id"
    | "username"
    | "password"
    | "role"
    | "parentId"
    | "points"
    | "createdAt"
    | "updatedAt"
    | "isActive"
    | "rechargePerm"
    | "withdrawPerm"
    | "agentProtect"
    | "status"
    | "lastLoggedIn"
    | "contactNumber"
    | "remarks"
    | "email"
  >
>;

type ChangePasswordBody = {
  oldPassword: string;
  newPassword: string;
};

export { CreateUserBody, UpdateUserBody, ChangePasswordBody };
