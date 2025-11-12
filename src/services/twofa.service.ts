import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { prisma } from "@game/database/prismaClient";
import { decrypt, encrypt } from "@game/lib/crypto";

const BACKUP_CODE_COUNT = 10;

export class TwoFactorService {
  /**
   * Generate TOTP secret + QR code, save encrypted secret
   */
  static async generateSecret(companyId: string) {
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Venture:${companyId}`,
      issuer: "Venture",
    });

    const qr = await qrcode.toDataURL(secret.otpauth_url!, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 1,
      width: 256,
    });

    const encryptedSecret = await encrypt(secret.base32);

    await prisma.company.update({
      where: { id: companyId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: encryptedSecret,
        // twoFactorMethod: "APP", // Optional: track method
      },
    });

    return { secret: secret.base32, qr };
  }

  /**
   * Verify setup token and enable 2FA + generate encrypted backup codes
   */
  static async verifyAndEnable(companyId: string, token: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { twoFactorSecret: true },
    });

    if (!company?.twoFactorSecret) throw new Error("2FA not set up");

    const secret = decrypt(company.twoFactorSecret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1, // ±30 seconds
    });

    if (!verified) throw new Error("Invalid token");

    const backupCodes = Array.from(
      { length: BACKUP_CODE_COUNT },
      () => speakeasy.generateSecret({ length: 10 }).base32
    );

    const encryptedCodes = await Promise.all(backupCodes.map(encrypt));

    await prisma.$transaction([
      prisma.company.update({
        where: { id: companyId },
        data: { twoFactorEnabled: true },
      }),
      prisma.backupCode.deleteMany({ where: { companyId } }),
      ...encryptedCodes.map((codeHash) =>
        prisma.backupCode.create({
          data: { companyId, codeHash },
        })
      ),
    ]);

    return { backupCodes };
  }

  /**
   * Verify TOTP token during login
   */
  static async verifyToken(companyId: string, token: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!company?.twoFactorSecret || !company.twoFactorEnabled) {
      throw new Error("2FA not configured or enabled");
    }

    const secret = decrypt(company.twoFactorSecret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 2, // ±60 seconds
    });

    if (!verified) throw new Error("Invalid 2FA token");

    return true;
  }

  /**
   * Verify backup code (encrypted in DB)
   */
  static async verifyBackupCode(companyId: string, code: string) {
    const backup = await prisma.backupCode.findFirst({
      where: { companyId, redeemed: false },
    });

    if (!backup) throw new Error("No unused backup codes");

    const decryptedHash = decrypt(backup.codeHash);
    const match = decryptedHash === code;

    if (!match) throw new Error("Invalid backup code");

    await prisma.backupCode.update({
      where: { id: backup.id },
      data: { redeemed: true },
    });

    return true;
  }

  /**
   * Disable 2FA with token or backup code
   */
  static async disable(companyId: string, token?: string, backupCode?: string) {
    if (token) {
      await this.verifyToken(companyId, token);
    } else if (backupCode) {
      await this.verifyBackupCode(companyId, backupCode);
    } else {
      throw new Error("Token or backup code required");
    }

    await prisma.$transaction([
      prisma.company.update({
        where: { id: companyId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          // twoFactorMethod: null,
        },
      }),
      prisma.backupCode.deleteMany({ where: { companyId } }),
    ]);

    return true;
  }

  /**
   * List unused backup codes (only IDs + dates for security)
   */
  static async listBackupCodes(companyId: string) {
    return await prisma.backupCode.findMany({
      where: { companyId, redeemed: false },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
