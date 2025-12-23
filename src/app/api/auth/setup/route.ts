import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, hasUsers, createSession, isAuthDisabled } from "@/lib/auth";

const setupSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
});

export async function GET() {
  // Check if setup is needed
  if (isAuthDisabled()) {
    return NextResponse.json({
      setupRequired: false,
      authDisabled: true,
    });
  }

  const hasExistingUsers = await hasUsers();

  return NextResponse.json({
    setupRequired: !hasExistingUsers,
    authDisabled: false,
  });
}

export async function POST(request: NextRequest) {
  // Check if auth is disabled
  if (isAuthDisabled()) {
    return NextResponse.json(
      { error: "Authentication is disabled" },
      { status: 400 }
    );
  }

  // Check if users already exist
  const hasExistingUsers = await hasUsers();
  if (hasExistingUsers) {
    return NextResponse.json(
      { error: "Setup already completed" },
      { status: 400 }
    );
  }

  // Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const result = setupSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { username, password } = result.data;

  try {
    // Create the admin user
    const user = await createUser(username, password);

    // Create a session
    await createSession(user.id, user.username);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
