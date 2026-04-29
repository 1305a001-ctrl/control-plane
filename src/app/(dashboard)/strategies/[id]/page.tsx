"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { StrategyPerformance } from "./StrategyPerformance";

type Status = "active" | "inactive" | "draft";

interface SignalCondition {
  condition: string;
  weight: number;
}

interface RiskFilters {
  min_source_credibility: number;
  min_evidence_strength: number;
  max_narrative_age_hours: number;
}

export default function StrategyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: strategies, isLoading } = api.strategies.list.useQuery({});
  const strategy = strategies?.find((s) => s.id === id);

  const updateStatus = api.strategies.updateStatus.useMutation({
    onSuccess: () => router.refresh(),
  });
  const updateFilters = api.strategies.updateFilters.useMutation({
    onSuccess: () => router.refresh(),
  });

  const [conditions, setConditions] = useState<SignalCondition[] | null>(null);
  const [filters, setFilters] = useState<RiskFilters | null>(null);
  const [saved, setSaved] = useState(false);

  if (isLoading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!strategy) return <p className="text-sm text-gray-500">Strategy not found.</p>;

  const fm = strategy.frontmatter as Record<string, unknown>;
  const activeConditions: SignalCondition[] = conditions ??
    ((fm.signal_conditions as SignalCondition[]) || []);
  const activeFilters: RiskFilters = filters ?? {
    min_source_credibility: (fm.risk_filters as RiskFilters)?.min_source_credibility ?? 0.5,
    min_evidence_strength: (fm.risk_filters as RiskFilters)?.min_evidence_strength ?? 0.5,
    max_narrative_age_hours: (fm.risk_filters as RiskFilters)?.max_narrative_age_hours ?? 24,
  };

  function setCondition(i: number, field: keyof SignalCondition, value: string | number) {
    const next = activeConditions.map((c, idx) =>
      idx === i ? { ...c, [field]: value } : c,
    );
    setConditions(next);
    setSaved(false);
  }

  function addCondition() {
    setConditions([...activeConditions, { condition: "", weight: 0.33 }]);
    setSaved(false);
  }

  function removeCondition(i: number) {
    setConditions(activeConditions.filter((_, idx) => idx !== i));
    setSaved(false);
  }

  async function handleSaveFilters() {
    await updateFilters.mutateAsync({
      id: strategy!.id,
      signalConditions: activeConditions,
      riskFilters: activeFilters,
    });
    setSaved(true);
  }

  const statusColors: Record<Status, "default" | "outline" | "secondary"> = {
    active: "default",
    draft: "outline",
    inactive: "secondary",
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-xs text-gray-500 hover:text-gray-300 mb-2 block"
          >
            ← Strategies
          </button>
          <h1 className="text-xl font-semibold">{strategy.name}</h1>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{strategy.slug}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={statusColors[strategy.status as Status]}>{strategy.status}</Badge>
        </div>
      </div>

      {/* Performance — read-only signal/trade stats */}
      <StrategyPerformance strategyId={strategy.id} />

      {/* Status control */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Status</h2>
        <div className="flex gap-2">
          {(["active", "draft", "inactive"] as Status[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={strategy.status === s ? "default" : "outline"}
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ id: strategy.id, status: s })}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Only <span className="text-white">active</span> strategies are loaded by the pipeline.
        </p>
      </section>

      {/* Signal conditions */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Signal Conditions
          </h2>
          <button
            onClick={addCondition}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            + Add condition
          </button>
        </div>

        {activeConditions.length === 0 && (
          <p className="text-xs text-gray-500">No conditions defined.</p>
        )}

        {activeConditions.map((c, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                value={c.condition}
                onChange={(e) => setCondition(i, "condition", e.target.value)}
                placeholder="Describe the signal condition..."
                className="text-sm"
              />
            </div>
            <div className="w-20">
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={c.weight}
                onChange={(e) => setCondition(i, "weight", parseFloat(e.target.value) || 0)}
                className="text-sm text-center"
              />
            </div>
            <button
              onClick={() => removeCondition(i)}
              className="text-gray-600 hover:text-red-400 mt-2 text-sm"
            >
              ✕
            </button>
          </div>
        ))}
        {activeConditions.length > 0 && (
          <p className="text-xs text-gray-600">
            Weights total:{" "}
            <span className={Math.abs(activeConditions.reduce((s, c) => s + c.weight, 0) - 1) > 0.01 ? "text-yellow-400" : "text-green-400"}>
              {activeConditions.reduce((s, c) => s + c.weight, 0).toFixed(2)}
            </span>
            {" "}(should sum to 1.0)
          </p>
        )}
      </section>

      {/* Risk filters */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Risk Filters
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-gray-400">Min Source Credibility</Label>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={activeFilters.min_source_credibility}
              onChange={(e) =>
                setFilters({ ...activeFilters, min_source_credibility: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-gray-400">Min Evidence Strength</Label>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={activeFilters.min_evidence_strength}
              onChange={(e) =>
                setFilters({ ...activeFilters, min_evidence_strength: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-gray-400">Max Narrative Age (hours)</Label>
            <Input
              type="number"
              step="1"
              min="1"
              value={activeFilters.max_narrative_age_hours}
              onChange={(e) =>
                setFilters({ ...activeFilters, max_narrative_age_hours: parseInt(e.target.value) || 24 })
              }
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSaveFilters}
          disabled={updateFilters.isPending}
        >
          {updateFilters.isPending ? "Saving..." : "Save Changes"}
        </Button>
        {saved && <p className="text-xs text-green-400">Saved</p>}
      </div>

      {/* Read-only metadata */}
      <section className="border-t border-gray-800 pt-6 flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Metadata
        </h2>
        <Row label="Type" value={strategy.type} />
        <Row label="Version" value={strategy.version} />
        <Row label="Assets" value={(fm.assets as string[])?.join(", ")} />
        <Row label="Sources" value={(fm.sources as string[])?.join(", ")} />
        <Row label="Output Channels" value={(fm.output_channels as string[])?.join(", ")} />
        <Row label="Git SHA" value={strategy.gitSha.slice(0, 12)} mono />
        <Row label="Content Hash" value={strategy.contentHash} mono />
        <Row label="Last Synced" value={new Date(strategy.syncedAt).toLocaleString()} />
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="w-36 shrink-0 text-gray-500">{label}</span>
      <span className={mono ? "font-mono text-xs text-gray-300" : "text-gray-200"}>
        {String(value ?? "—")}
      </span>
    </div>
  );
}
