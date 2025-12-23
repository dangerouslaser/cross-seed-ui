export async function register() {
  // Only run on the server, not during build
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to avoid bundling issues
    const { startScheduler } = await import("@/lib/services/scheduler");
    startScheduler();
  }
}
