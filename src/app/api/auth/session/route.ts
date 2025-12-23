import { NextResponse } from "next/server";
import { getSession, isAuthDisabled, getUserById } from "@/lib/auth";

export async function GET() {
  // If auth is disabled, return a mock session
  if (isAuthDisabled()) {
    return NextResponse.json({
      authenticated: true,
      authDisabled: true,
      user: {
        id: 0,
        username: "admin",
      },
    });
  }

  const session = await getSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      authDisabled: false,
    });
  }

  // Get user details
  const user = await getUserById(session.userId);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      authDisabled: false,
    });
  }

  return NextResponse.json({
    authenticated: true,
    authDisabled: false,
    user: {
      id: user.id,
      username: user.username,
    },
    expiresAt: session.expiresAt,
  });
}
