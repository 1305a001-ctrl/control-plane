-- Phase 4 domain tables
-- Run once: psql $DATABASE_URL -f migrations/001_domain_tables.sql

CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('news','trading','poly')),
  status TEXT NOT NULL CHECK (status IN ('active','inactive','draft')),
  git_sha TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  frontmatter JSONB NOT NULL,
  body TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_created_at DATE NOT NULL,
  file_updated_at DATE NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS strategies_slug_git_sha_idx ON strategies (slug, git_sha);
CREATE INDEX IF NOT EXISTS strategies_slug_idx ON strategies (slug);
CREATE INDEX IF NOT EXISTS strategies_status_idx ON strategies (status);

CREATE TABLE IF NOT EXISTS strategy_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  activated_by TEXT NOT NULL,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS research_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  supersedes_id UUID
);

CREATE INDEX IF NOT EXISTS research_configs_slug_idx ON research_configs (slug);
CREATE INDEX IF NOT EXISTS research_configs_active_idx ON research_configs (is_active);

CREATE TABLE IF NOT EXISTS research_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES research_configs(id),
  slug TEXT NOT NULL,
  version INTEGER NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_reason TEXT,
  previous_config JSONB,
  new_config JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  external_id TEXT,
  url TEXT,
  title TEXT NOT NULL,
  body TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assets TEXT[] NOT NULL DEFAULT '{}',
  sentiment_score REAL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  source_credibility REAL CHECK (source_credibility >= 0 AND source_credibility <= 1),
  raw JSONB NOT NULL,
  supersedes_id UUID
);

CREATE INDEX IF NOT EXISTS articles_source_idx ON articles (source);
CREATE INDEX IF NOT EXISTS articles_published_idx ON articles (published_at);

CREATE TABLE IF NOT EXISTS market_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  research_config_id UUID NOT NULL REFERENCES research_configs(id),
  strategy_git_sha TEXT NOT NULL,
  research_config_version INTEGER NOT NULL,
  asset TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long','short','neutral','watch')),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  risk_score JSONB NOT NULL,
  composite_risk_score REAL NOT NULL CHECK (composite_risk_score >= 0 AND composite_risk_score <= 1),
  source_article_ids UUID[] NOT NULL,
  redis_channel TEXT NOT NULL,
  payload JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  supersedes_id UUID
);

CREATE INDEX IF NOT EXISTS market_signals_strategy_idx ON market_signals (strategy_id);
CREATE INDEX IF NOT EXISTS market_signals_asset_idx ON market_signals (asset);
CREATE INDEX IF NOT EXISTS market_signals_published_idx ON market_signals (published_at);

CREATE TABLE IF NOT EXISTS signal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES market_signals(id),
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluation_horizon TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('win','loss','flat','expired')),
  price_at_signal REAL,
  price_at_evaluation REAL,
  price_change_pct REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS consistency_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  asset TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  horizon TEXT NOT NULL,
  total_signals INTEGER NOT NULL DEFAULT 0,
  correct_signals INTEGER NOT NULL DEFAULT 0,
  accuracy REAL,
  expectancy REAL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consistency_scores_strategy_idx ON consistency_scores (strategy_id);
CREATE INDEX IF NOT EXISTS consistency_scores_asset_idx ON consistency_scores (asset);

CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  control_strategy_id UUID REFERENCES strategies(id),
  variant_strategy_id UUID REFERENCES strategies(id),
  asset TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running','completed','cancelled')),
  results JSONB,
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running','completed','partial','failed')),
  active_config_ids UUID[] NOT NULL DEFAULT '{}',
  active_config_versions INTEGER[] NOT NULL DEFAULT '{}',
  active_strategy_slugs TEXT[] NOT NULL DEFAULT '{}',
  articles_fetched INTEGER NOT NULL DEFAULT 0,
  articles_skipped INTEGER NOT NULL DEFAULT 0,
  articles_failed INTEGER NOT NULL DEFAULT 0,
  signals_produced INTEGER NOT NULL DEFAULT 0,
  signals_published INTEGER NOT NULL DEFAULT 0,
  skipped_reasons JSONB NOT NULL DEFAULT '{}',
  errors JSONB NOT NULL DEFAULT '[]',
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS pipeline_audit_started_idx ON pipeline_audit (started_at);
CREATE INDEX IF NOT EXISTS pipeline_audit_status_idx ON pipeline_audit (status);
