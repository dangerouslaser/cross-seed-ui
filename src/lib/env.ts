import { z } from "zod";

const envSchema = z.object({
  CROSSSEED_URL: z.string().url(),
  CROSSSEED_CONFIG_PATH: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  DISABLE_AUTH: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DATABASE_PATH: z.string().default("/app/data/ui.db"),
  JWT_SECRET: z.string().optional(),
});

function getEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten());
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = getEnv();
export type Env = z.infer<typeof envSchema>;
