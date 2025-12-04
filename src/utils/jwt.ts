import jwt, { SignOptions } from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "@game/core/common/config/env";

export interface TokenPayload {
  id: string;
  role: Role;
  username?: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, options);
}

export function generateRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, options);
}

export function verifyToken(
  token: string,
  type: "access" | "refresh" = "access"
): TokenPayload {
  const secret =
    type === "access" ? env.ACCESS_TOKEN_SECRET : env.REFRESH_TOKEN_SECRET;
  return jwt.verify(token, secret) as TokenPayload;
}
