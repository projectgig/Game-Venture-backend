import { z } from "zod";

export const enable2FASchema = z.object({
  token: z.string().length(6),
});

export const verify2FASchema = z.object({
  token: z.string().length(6),
  tempToken: z.string(),
});

export const disable2FASchema = z
  .object({
    token: z.string().length(6).optional(),
    backupCode: z.string().optional(),
  })
  .refine((d) => d.token || d.backupCode, {
    message: "Either token or backupCode required",
  });

export const recoveryRequestSchema = z.object({
  reason: z.string().min(10),
});
