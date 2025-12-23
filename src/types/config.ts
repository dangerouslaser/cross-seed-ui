import { z } from "zod";

// Cross-seed configuration schema
export const CrossSeedConfigSchema = z.object({
  // Sensitive Options
  apiKey: z.string().optional(),
  torznab: z.array(z.string()).default([]),
  sonarr: z.array(z.string()).default([]),
  radarr: z.array(z.string()).default([]),
  torrentClients: z.array(z.string()).default([]),
  notificationWebhookUrls: z.array(z.string()).default([]),

  // Network
  host: z.string().default("0.0.0.0"),
  port: z.number().min(1024).max(65535).default(2468),

  // Client Settings
  useClientTorrents: z.boolean().default(true),

  // Timing
  delay: z.number().min(30).default(30),
  rssCadence: z.string().nullable().default("30 minutes"),
  searchCadence: z.string().nullable().default("1 day"),
  snatchTimeout: z.string().nullable().default("30 seconds"),
  searchTimeout: z.string().nullable().default("2 minutes"),
  excludeOlder: z.string().default("2 weeks"),
  excludeRecentSearch: z.string().default("3 days"),
  searchLimit: z.number().nullable().default(400),

  // Paths
  dataDirs: z.array(z.string()).default([]),
  linkDirs: z.array(z.string()).default([]),
  linkCategory: z.string().default("cross-seed-link"),
  linkType: z.enum(["symlink", "hardlink", "reflink"]).default("hardlink"),
  flatLinking: z.boolean().default(false),
  maxDataDepth: z.number().min(1).max(10).default(2),
  torrentDir: z.string().nullable().default(null),
  outputDir: z.string().nullable().default(null),

  // Matching
  matchMode: z.enum(["strict", "flexible", "partial"]).default("flexible"),
  fuzzySizeThreshold: z.number().min(0.01).max(0.1).default(0.02),
  includeSingleEpisodes: z.boolean().default(false),
  includeNonVideos: z.boolean().default(false),
  seasonFromEpisodes: z.number().nullable().default(1),

  // Behavior
  action: z.enum(["save", "inject"]).default("inject"),
  skipRecheck: z.boolean().default(true),
  autoResumeMaxDownload: z.number().min(0).max(52428800).default(52428800),
  ignoreNonRelevantFilesToResume: z.boolean().default(false),
  duplicateCategories: z.boolean().default(false),

  // Filtering
  blockList: z.array(z.string()).default([]),
});

export type CrossSeedConfig = z.infer<typeof CrossSeedConfigSchema>;

// Options that require a restart when changed
export const RESTART_REQUIRED_OPTIONS = [
  "torznab",
  "sonarr",
  "radarr",
  "torrentClients",
  "host",
  "port",
  "dataDirs",
  "linkDirs",
  "torrentDir",
] as const;

// Partial config update schema
export const CrossSeedConfigUpdateSchema = CrossSeedConfigSchema.partial();
export type CrossSeedConfigUpdate = z.infer<typeof CrossSeedConfigUpdateSchema>;
