import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

const SESSION_COOKIE_NAME = "crossseed-session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function shouldUseSecureCookie(): boolean {
  // Explicit override via environment variable
  if (process.env.COOKIE_SECURE === "false") {
    return false;
  }
  if (process.env.COOKIE_SECURE === "true") {
    return true;
  }
  // Default: secure in production, unless running on localhost/internal network
  // For self-hosted apps on HTTP, users should set COOKIE_SECURE=false
  return false; // Default to false for self-hosted compatibility
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "crossseed-ui-default-secret-change-me";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: number;
  username: string;
  sessionId: string;
  expiresAt: Date;
}

export async function createSession(userId: number, username: string): Promise<string> {
  const sessionId = nanoid();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  const token = await new SignJWT({
    userId,
    username,
    sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret());

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax", // Use lax for better compatibility with HTTP
    expires: expiresAt,
    path: "/",
  });

  return sessionId;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    return {
      userId: payload.userId as number,
      username: payload.username as string,
      sessionId: payload.sessionId as string,
      expiresAt: new Date((payload.exp as number) * 1000),
    };
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  // Check if auth is disabled
  if (process.env.DISABLE_AUTH === "true") {
    return true;
  }

  const session = await getSession();
  return session !== null;
}
