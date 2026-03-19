import crypto from "crypto";

const TOKEN_BYTE_LENGTH = 32;
const TOKEN_EXPIRY_HOURS = 48;

export function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_BYTE_LENGTH).toString("hex");
}

export function generateInvitationToken(): string {
  return generateSecureToken();
}

export function generatePasswordResetToken(): string {
  return generateSecureToken();
}

export function generateEmailVerificationToken(): string {
  return generateSecureToken();
}

export function getTokenExpiry(hours: number = TOKEN_EXPIRY_HOURS): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

export function getInvitationTokenExpiry(): Date {
  return getTokenExpiry(TOKEN_EXPIRY_HOURS);
}

export function getPasswordResetTokenExpiry(): Date {
  return getTokenExpiry(1);
}

export function getEmailVerificationTokenExpiry(): Date {
  return getTokenExpiry(24);
}

export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

export function isTokenValid(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }
  const hexPattern = /^[a-f0-9]+$/i;
  return token.length === TOKEN_BYTE_LENGTH * 2 && hexPattern.test(token);
}

export function compareTokens(tokenA: string, tokenB: string): boolean {
  if (!tokenA || !tokenB) {
    return false;
  }
  if (tokenA.length !== tokenB.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(
      Buffer.from(tokenA, "utf8"),
      Buffer.from(tokenB, "utf8"),
    );
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateShortCode(length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export interface TokenPayload {
  token: string;
  expiresAt: Date;
  hashedToken: string;
}

export function createInvitationTokenPayload(): TokenPayload {
  const token = generateInvitationToken();
  return {
    token,
    expiresAt: getInvitationTokenExpiry(),
    hashedToken: hashToken(token),
  };
}

export function createPasswordResetTokenPayload(): TokenPayload {
  const token = generatePasswordResetToken();
  return {
    token,
    expiresAt: getPasswordResetTokenExpiry(),
    hashedToken: hashToken(token),
  };
}

export function createEmailVerificationTokenPayload(): TokenPayload {
  const token = generateEmailVerificationToken();
  return {
    token,
    expiresAt: getEmailVerificationTokenExpiry(),
    hashedToken: hashToken(token),
  };
}

export function validateTokenFormat(token: unknown): token is string {
  if (typeof token !== "string") {
    return false;
  }
  return isTokenValid(token);
}
