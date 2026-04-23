"use client";

import { useRouter } from "next/navigation";
import { SchemaForm } from "~/components/schema-form";
import { ResearchConfigFormSchema, type ResearchConfigFormValues, SOURCES } from "~/lib/schemas";
import { api } from "~/trpc/react";

// Attach field metadata so SchemaForm renders the right controls
const annotatedSchema = ResearchConfigFormSchema.extend({
  name: ResearchConfigFormSchema.shape.name.describe("Name|text|e.g. Crypto Daily"),
  slug: ResearchConfigFormSchema.shape.slug.describe("Slug|text|e.g. crypto-daily"),
  description: ResearchConfigFormSchema.shape.description.describe("Description|textarea|Optional description"),
  sources: ResearchConfigFormSchema.shape.sources.describe(
    `Sources|multicheck||${SOURCES.join(",")}`
  ),
  assets: ResearchConfigFormSchema.shape.assets.describe("Assets (space-separated)|text|BTC ETH NVDA fed-policy"),
  max_articles_per_run: ResearchConfigFormSchema.shape.max_articles_per_run.describe("Max Articles Per Run|number|100"),
  min_source_credibility: ResearchConfigFormSchema.shape.min_source_credibility.describe("Min Source Credibility (0–1)|number|0.5"),
  min_evidence_strength: ResearchConfigFormSchema.shape.min_evidence_strength.describe("Min Evidence Strength (0–1)|number|0.5"),
  max_narrative_age_hours: ResearchConfigFormSchema.shape.max_narrative_age_hours.describe("Max Narrative Age (hours)|number|24"),
  schedule_cron: ResearchConfigFormSchema.shape.schedule_cron.describe("Schedule Cron|text|0 * * * *"),
  change_reason: ResearchConfigFormSchema.shape.change_reason.describe("Change Reason|text|Initial version"),
});

export default function NewConfigPage() {
  const router = useRouter();
  const createConfig = api.configs.create.useMutation({
    onSuccess: () => router.push("/configs"),
  });

  async function handleSubmit(values: ResearchConfigFormValues) {
    const assetsArray = values.assets.split(/\s+/).filter(Boolean);
    await createConfig.mutateAsync({
      slug: values.slug,
      name: values.name,
      description: values.description,
      config: {
        sources: values.sources,
        assets: assetsArray,
        max_articles_per_run: values.max_articles_per_run,
        min_source_credibility: values.min_source_credibility,
        min_evidence_strength: values.min_evidence_strength,
        max_narrative_age_hours: values.max_narrative_age_hours,
        schedule_cron: values.schedule_cron,
      },
      changeReason: values.change_reason,
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold">New Research Config</h1>
        <p className="text-sm text-gray-400">
          Creates a new versioned config. The pipeline will pick it up on the next run.
        </p>
      </div>
      <SchemaForm<ResearchConfigFormValues>
        schema={annotatedSchema}
        onSubmit={handleSubmit}
        isSubmitting={createConfig.isPending}
        submitLabel="Create Config"
        defaultValues={{
          max_articles_per_run: 100,
          min_source_credibility: 0.5,
          min_evidence_strength: 0.5,
          max_narrative_age_hours: 24,
        }}
        fieldOrder={[
          "name", "slug", "description", "sources", "assets",
          "max_articles_per_run", "min_source_credibility",
          "min_evidence_strength", "max_narrative_age_hours",
          "schedule_cron", "change_reason",
        ]}
      />
    </div>
  );
}
