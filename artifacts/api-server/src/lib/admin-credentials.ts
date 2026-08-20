import { eq } from "drizzle-orm";
import { db, adminUsers } from "@workspace/db";
import { hashPassword, verifyPassword } from "./password";
import { logger } from "./logger";

export async function getAdminPasswordHash(username: string): Promise<string | null> {
  // Check database first for password hash
  try {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    if (user && user.passwordHash) {
      return user.passwordHash;
    }
  } catch (err) {
    logger.warn({ err }, "Could not query adminUsers table; falling back to environment variables.");
  }

  // Fallback to environment variables
  const expectedUsername = process.env["ADMIN_USERNAME"];
  const passwordHash = process.env["ADMIN_PASSWORD_HASH"];
  const plaintextPassword = process.env["ADMIN_PASSWORD"];

  if (!expectedUsername || (!passwordHash && !plaintextPassword)) {
    logger.error(
      "Admin login attempted but ADMIN_USERNAME and ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD) are not configured.",
    );
    return null;
  }

  if (username !== expectedUsername) {
    return null;
  }

  return passwordHash ?? hashPassword(plaintextPassword as string);
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const effectiveHash = await getAdminPasswordHash(username);
  if (!effectiveHash) {
    return false;
  }
  return verifyPassword(password, effectiveHash);
}

export async function setAdminPassword(username: string, newPassword: string): Promise<void> {
  const newHash = hashPassword(newPassword);
  await db
    .insert(adminUsers)
    .values({
      username,
      passwordHash: newHash,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: adminUsers.username,
      set: {
        passwordHash: newHash,
        updatedAt: new Date(),
      },
    });
}

