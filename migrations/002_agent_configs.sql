-- Agent configs: trading and poly agent configuration, versioned and auditable.
-- Run: cat migrations/002_agent_configs.sql | ssh benadmin@ai-primary "docker exec -i postgres psql -U benadmin -d aicore"

CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('trading', 'poly')),
  slug TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  supersedes_id UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_configs_type_slug_version_idx
  ON agent_configs (agent_type, slug, version);
CREATE INDEX IF NOT EXISTS agent_configs_type_active_idx
  ON agent_configs (agent_type, is_active);
