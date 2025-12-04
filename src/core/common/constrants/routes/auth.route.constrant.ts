export const AUTH_ROUTES = {
  LOGIN: "/login",
  LOGOUT: "/logout",
  REFRESH_TOKEN: "/refreshToken",

  VERIFY_2FA: "/2fa/verify",
  SETUP_2FA: "/2fa/setup",
  ENABLE_2FA: "/2fa/enable",
  DISABLE_2FA: "/2fa/disable",
  BACKUP_CODES: "/2fa/backup-codes",

  REQUEST_RECOVERY: "/2fa/recovery/request",
  APPROVE_RECOVERY: "/2fa/recovery/approve/:recoveryId",
};
