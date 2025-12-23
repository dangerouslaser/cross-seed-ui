import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./password";
import { createSession, deleteSession, getSession, isAuthenticated } from "./session";

export { createSession, deleteSession, getSession, isAuthenticated };

export interface User {
  id: number;
  username: string;
  createdAt: Date | null;
  lastLogin: Date | null;
}

export async function createUser(
  username: string,
  password: string
): Promise<User> {
  const db = getDb();
  const passwordHash = await hashPassword(password);

  const result = db
    .insert(schema.users)
    .values({
      username,
      passwordHash,
    })
    .returning()
    .get();

  return {
    id: result.id,
    username: result.username,
    createdAt: result.createdAt,
    lastLogin: result.lastLogin,
  };
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  const db = getDb();

  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .get();

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  // Update last login
  db.update(schema.users)
    .set({ lastLogin: new Date() })
    .where(eq(schema.users.id, user.id))
    .run();

  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    lastLogin: new Date(),
  };
}

export async function getUserById(id: number): Promise<User | null> {
  const db = getDb();

  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .get();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
}

export async function hasUsers(): Promise<boolean> {
  const db = getDb();
  const count = db.select().from(schema.users).all();
  return count.length > 0;
}

export async function changePassword(
  userId: number,
  newPassword: string
): Promise<void> {
  const db = getDb();
  const passwordHash = await hashPassword(newPassword);

  db.update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, userId))
    .run();
}

export function isAuthDisabled(): boolean {
  return process.env.DISABLE_AUTH === "true";
}
