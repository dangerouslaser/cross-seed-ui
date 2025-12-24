import { z } from "zod";

// Torznab indexer can be a string URL or an object with config
const TorznabIndexerSchema = z.union([
  z.string(),
  z.object({
    url: z.string(),
    apikey: z.string().optional(),
    categories: z.array(z.union([z.string(), z.number()])).optional(),
  }).passthrough(),
]);

// Torrent client can be a string URL or an object with config
const TorrentClientSchema = z.union([
  z.string(),
  z.object({
    type: z.string().optional(),
    baseUrl: z.string().optional(),
    url: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    cookie: z.string().optional(),
    client: z.string().optional(),
  }).passthrough(),
]);

// Sonarr/Radarr instance can be a string URL or an object
const ArrInstanceSchema = z.union([
  z.string(),
  z.object({
    url: z.string().optional(),
    apikey: z.string().optional(),
  }).passthrough(),
]);

// Cross-seed configuration schema
// IMPORTANT: Arrays use .optional() NOT .default([]) to avoid overwriting user data
export const CrossSeedConfigSchema = z.object({
  // Sensitive Options
  apiKey: z.string().optional(),
  torznab: z.array(TorznabIndexerSchema).optional(),
  sonarr: z.array(ArrInstanceSchema).optional(),
  radarr: z.array(ArrInstanceSchema).optional(),
  torrentClients: z.array(TorrentClientSchema).optional(),
  notificationWebhookUrls: z.array(z.string()).optional(),

  // Network
  host: z.string().optional(),
  port: z.number().min(1024).max(65535).optional(),

  // Client Settings
  useClientTorrents: z.boolean().optional(),

  // Timing
  delay: z.number().min(0).optional(),
  rssCadence: z.string().nullable().optional(),
  searchCadence: z.string().nullable().optional(),
  snatchTimeout: z.string().nullable().optional(),
  searchTimeout: z.string().nullable().optional(),
  excludeOlder: z.string().optional(),
  excludeRecentSearch: z.string().optional(),
  searchLimit: z.number().nullable().optional(),

  // Paths
  dataDirs: z.array(z.string()).optional(),
  linkDirs: z.array(z.string()).optional(),
  linkCategory: z.string().optional(),
  linkType: z.enum(["symlink", "hardlink", "reflink"]).optional(),
  flatLinking: z.boolean().optional(),
  maxDataDepth: z.number().min(1).max(10).optional(),
  torrentDir: z.string().nullable().optional(),
  outputDir: z.string().nullable().optional(),

  // Matching
  matchMode: z.enum(["strict", "flexible", "partial"]).optional(),
  fuzzySizeThreshold: z.number().min(0.01).max(0.1).optional(),
  includeSingleEpisodes: z.boolean().optional(),
  includeNonVideos: z.boolean().optional(),
  seasonFromEpisodes: z.number().nullable().optional(),

  // Behavior
  action: z.enum(["save", "inject"]).optional(),
  skipRecheck: z.boolean().optional(),
  autoResumeMaxDownload: z.number().min(0).max(52428800).optional(),
  ignoreNonRelevantFilesToResume: z.boolean().optional(),
  duplicateCategories: z.boolean().optional(),

  // Filtering
  blockList: z.array(z.string()).optional(),
}).passthrough(); // Allow unknown fields to pass through

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
