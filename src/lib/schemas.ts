import { z } from "zod";

export const SOURCES = ["newsapi", "cryptopanic", "alphavantage", "finnhub", "guardian", "reddit"] as const;
export const OUTPUT_CHANNELS = ["signals:new", "signals:trading", "signals:poly", "signals:critical"] as const;

export const ResearchConfigFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be kebab-case, e.g. crypto-daily"),
  description: z.string().optional(),
  sources: z.array(z.enum(SOURCES)).min(1, "Select at least one source"),
  assets: z.string().min(1, "Enter at least one asset symbol"),
  max_articles_per_run: z.coerce.number().int().min(1).max(500).default(100),
  min_source_credibility: z.coerce.number().min(0).max(1).default(0.5),
  min_evidence_strength: z.coerce.number().min(0).max(1).default(0.5),
  max_narrative_age_hours: z.coerce.number().int().min(1).default(24),
  schedule_cron: z.string().optional(),
  change_reason: z.string().optional(),
});

export type ResearchConfigFormValues = z.infer<typeof ResearchConfigFormSchema>;
