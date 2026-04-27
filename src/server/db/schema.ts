import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  pgTableCreator,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

// ─── NextAuth tables (prefixed, managed by drizzle-kit push) ─────────────────

export const createTable = pgTableCreator((name) => `control-plane_${name}`);

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d.timestamp({ mode: "date", withTimezone: true }),
  image: d.varchar({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ─── Domain tables (managed by SQL migrations, Drizzle for type safety only) ─
// drizzle-kit ignores these (tablesFilter: ["control-plane_*"]).

export const strategies = pgTable(
  "strategies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    version: text("version").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
    gitSha: text("git_sha").notNull(),
    contentHash: text("content_hash").notNull(),
    frontmatter: jsonb("frontmatter").notNull(),
    body: text("body").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
    fileCreatedAt: date("file_created_at").notNull(),
    fileUpdatedAt: date("file_updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("strategies_slug_git_sha_idx").on(t.slug, t.gitSha),
    index("strategies_slug_idx").on(t.slug),
    index("strategies_status_idx").on(t.status),
  ],
);

export const strategyActivations = pgTable("strategy_activations", {
  id: uuid("id").primaryKey().defaultRandom(),
  strategyId: uuid("strategy_id").notNull().references(() => strategies.id),
  activatedAt: timestamp("activated_at", { withTimezone: true }).defaultNow().notNull(),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  activatedBy: text("activated_by").notNull(),
  reason: text("reason"),
});

export const researchConfigs = pgTable(
  "research_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    version: integer("version").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    config: jsonb("config").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: text("created_by").notNull(),
    supersedesId: uuid("supersedes_id"),
  },
  (t) => [
    index("research_configs_slug_idx").on(t.slug),
    index("research_configs_active_idx").on(t.isActive),
  ],
);

export const researchConfigVersions = pgTable("research_config_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  configId: uuid("config_id").notNull().references(() => researchConfigs.id),
  slug: text("slug").notNull(),
  version: integer("version").notNull(),
  changedBy: text("changed_by").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  changeReason: text("change_reason"),
  previousConfig: jsonb("previous_config"),
  newConfig: jsonb("new_config").notNull(),
});

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    externalId: text("external_id"),
    url: text("url"),
    title: text("title").notNull(),
    body: text("body"),
    author: text("author"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    assets: text("assets").array().notNull().default([]),
    sentimentScore: real("sentiment_score"),
    sourceCredibility: real("source_credibility"),
    raw: jsonb("raw").notNull(),
    supersedesId: uuid("supersedes_id"),
  },
  (t) => [
    index("articles_source_idx").on(t.source),
    index("articles_published_idx").on(t.publishedAt),
  ],
);

export const marketSignals = pgTable(
  "market_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: uuid("strategy_id").notNull().references(() => strategies.id),
    researchConfigId: uuid("research_config_id").notNull().references(() => researchConfigs.id),
    strategyGitSha: text("strategy_git_sha").notNull(),
    researchConfigVersion: integer("research_config_version").notNull(),
    asset: text("asset").notNull(),
    direction: text("direction").notNull(),
    confidence: real("confidence").notNull(),
    riskScore: jsonb("risk_score").notNull(),
    compositeRiskScore: real("composite_risk_score").notNull(),
    sourceArticleIds: uuid("source_article_ids").array().notNull(),
    redisChannel: text("redis_channel").notNull(),
    payload: jsonb("payload").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
    supersedesId: uuid("supersedes_id"),
  },
  (t) => [
    index("market_signals_strategy_idx").on(t.strategyId),
    index("market_signals_asset_idx").on(t.asset),
    index("market_signals_published_idx").on(t.publishedAt),
  ],
);

export const signalOutcomes = pgTable("signal_outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  signalId: uuid("signal_id").notNull().references(() => marketSignals.id),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).defaultNow().notNull(),
  evaluationHorizon: text("evaluation_horizon").notNull(),
  outcome: text("outcome").notNull(),
  priceAtSignal: real("price_at_signal"),
  priceAtEvaluation: real("price_at_evaluation"),
  priceChangePct: real("price_change_pct"),
  notes: text("notes"),
});

export const consistencyScores = pgTable(
  "consistency_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: uuid("strategy_id").notNull().references(() => strategies.id),
    asset: text("asset").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    horizon: text("horizon").notNull(),
    totalSignals: integer("total_signals").notNull().default(0),
    correctSignals: integer("correct_signals").notNull().default(0),
    accuracy: real("accuracy"),
    expectancy: real("expectancy"),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("consistency_scores_strategy_idx").on(t.strategyId),
    index("consistency_scores_asset_idx").on(t.asset),
  ],
);

export const experiments = pgTable("experiments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  controlStrategyId: uuid("control_strategy_id").references(() => strategies.id),
  variantStrategyId: uuid("variant_strategy_id").references(() => strategies.id),
  asset: text("asset"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: text("status").notNull(),
  results: jsonb("results"),
  createdBy: text("created_by").notNull(),
});

export const pipelineAudit = pgTable(
  "pipeline_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").notNull().defaultRandom(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: text("status").notNull(),
    activeConfigIds: uuid("active_config_ids").array().notNull().default([]),
    activeConfigVersions: integer("active_config_versions").array().notNull().default([]),
    activeStrategySlugs: text("active_strategy_slugs").array().notNull().default([]),
    articlesFetched: integer("articles_fetched").notNull().default(0),
    articlesSkipped: integer("articles_skipped").notNull().default(0),
    articlesFailed: integer("articles_failed").notNull().default(0),
    signalsProduced: integer("signals_produced").notNull().default(0),
    signalsPublished: integer("signals_published").notNull().default(0),
    skippedReasons: jsonb("skipped_reasons").notNull().default({}),
    errors: jsonb("errors").notNull().default([]),
    durationMs: integer("duration_ms"),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (t) => [
    index("pipeline_audit_started_idx").on(t.startedAt),
    index("pipeline_audit_status_idx").on(t.status),
  ],
);

// ─── Phase 5 trading-agent: trades ──────────────────────────────────────────

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signalId: uuid("signal_id").notNull().references(() => marketSignals.id),
    agentConfigId: uuid("agent_config_id").notNull(),
    agentConfigVersion: integer("agent_config_version").notNull(),
    asset: text("asset").notNull(),
    direction: text("direction").notNull(),
    broker: text("broker").notNull(),
    sizeUsd: real("size_usd").notNull(),
    entryPrice: real("entry_price"),
    qty: real("qty"),
    takeProfitPrice: real("take_profit_price"),
    stopLossPrice: real("stop_loss_price"),
    timeStopAt: timestamp("time_stop_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    brokerOrderId: text("broker_order_id"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    exitPrice: real("exit_price"),
    pnlUsd: real("pnl_usd"),
    closeReason: text("close_reason"),
    errors: jsonb("errors").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("trades_status_idx").on(t.status),
    index("trades_signal_idx").on(t.signalId),
    index("trades_opened_at_idx").on(t.openedAt),
  ],
);

// ─── Phase 6 prospect-agent: leads ──────────────────────────────────────────

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    googlePlaceId: text("google_place_id"),
    niche: text("niche").notNull(),
    geoCity: text("geo_city"),
    geoCountry: text("geo_country").notNull().default("MY"),

    businessName: text("business_name").notNull(),
    businessAddress: text("business_address"),
    businessLat: real("business_lat"),
    businessLng: real("business_lng"),
    businessRating: real("business_rating"),
    businessReviewCount: integer("business_review_count"),
    businessPhone: text("business_phone"),
    businessWebsiteUrl: text("business_website_url"),

    websiteHttps: boolean("website_https"),
    websiteMobileScore: integer("website_mobile_score"),
    websiteHasBooking: boolean("website_has_booking"),
    websiteLastModified: date("website_last_modified"),

    fitScore: real("fit_score").notNull().default(0),
    scoreFactors: jsonb("score_factors").notNull().default({}),
    status: text("status").notNull().default("new"),

    chainName: text("chain_name"),
    chainRole: text("chain_role").notNull().default("standalone"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    notes: text("notes"),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (t) => [
    index("leads_status_score_idx").on(t.status, t.fitScore),
    index("leads_niche_geo_idx").on(t.niche, t.geoCity),
    index("leads_updated_idx").on(t.updatedAt),
  ],
);

// ─── Phase 7 poly-agent: poly_positions ─────────────────────────────────────

export const polyPositions = pgTable(
  "poly_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signalId: uuid("signal_id").notNull().references(() => marketSignals.id),
    agentConfigId: uuid("agent_config_id").notNull(),
    agentConfigVersion: integer("agent_config_version").notNull(),
    marketSlug: text("market_slug").notNull(),
    marketUrl: text("market_url"),
    marketConditionId: text("market_condition_id"),
    side: text("side").notNull(),
    stakeUsd: real("stake_usd").notNull(),
    entryProbability: real("entry_probability"),
    shares: real("shares"),
    status: text("status").notNull().default("pending"),
    broker: text("broker").notNull().default("paper"),
    resolvedOutcome: text("resolved_outcome"),
    exitProbability: real("exit_probability"),
    pnlUsd: real("pnl_usd"),
    closeReason: text("close_reason"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    errors: jsonb("errors").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("poly_positions_status_idx").on(t.status),
    index("poly_positions_signal_idx").on(t.signalId),
  ],
);

export const agentConfigs = pgTable(
  "agent_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentType: text("agent_type").notNull(),
    slug: text("slug").notNull(),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    description: text("description"),
    config: jsonb("config").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: text("created_by").notNull(),
    supersedesId: uuid("supersedes_id"),
  },
  (t) => [
    index("agent_configs_type_active_idx").on(t.agentType, t.isActive),
  ],
);
