"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export default function NewPolyConfigPage() {
  const router = useRouter();
  const create = api.agentConfigs.createPoly.useMutation({
    onSuccess: () => router.push("/poly"),
  });

  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    enabled: false,
    market_url: "",
    resolution_condition: "",
    min_confidence: 0.65,
    max_stake_pct: 0.02,
    notes: "",
  });

  function field(key: keyof typeof form) {
    return {
      value: String(form[key]),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.type === "number"
          ? parseFloat(e.target.value) || 0
          : e.target.value;
        setForm((f) => ({ ...f, [key]: val }));
      },
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      slug: form.slug,
      name: form.name,
      description: form.description || undefined,
      config: {
        enabled: form.enabled,
        market_url: form.market_url,
        resolution_condition: form.resolution_condition,
        min_confidence: form.min_confidence,
        max_stake_pct: form.max_stake_pct,
        notes: form.notes || undefined,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-lg">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs text-gray-500 hover:text-gray-300 mb-2 block"
        >
          ← Poly Agent
        </button>
        <h1 className="text-xl font-semibold">New Polymarket Config</h1>
        <p className="text-sm text-gray-400">Define a market, its resolution condition, and stake limits.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Slug <span className="text-xs text-gray-500">kebab-case, e.g. btc-100k-2026</span></Label>
        <Input placeholder="btc-100k-2026" {...field("slug")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Name</Label>
        <Input placeholder="e.g. BTC above $100k before end of 2026" {...field("name")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Polymarket URL</Label>
        <Input
          type="url"
          placeholder="https://polymarket.com/event/..."
          {...field("market_url")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Resolution Condition</Label>
        <Textarea
          placeholder="Describe exactly what resolves this market YES. Be precise — the agent uses this to evaluate signals."
          rows={3}
          {...field("resolution_condition")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Min Confidence</Label>
          <Input type="number" step="0.05" min="0" max="1" {...field("min_confidence")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Max Stake % of bankroll</Label>
          <Input type="number" step="0.005" min="0.001" max="0.5" {...field("max_stake_pct")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Description <span className="text-xs text-gray-500">(optional)</span></Label>
        <Input placeholder="One-liner" {...field("description")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Notes <span className="text-xs text-gray-500">(optional)</span></Label>
        <Textarea placeholder="Resolution date, liquidity notes, calibration guidance..." {...field("notes")} />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={form.enabled}
          onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="enabled">Enabled (leave unchecked until Phase 7 is live)</Label>
      </div>

      {create.error && (
        <p className="text-sm text-red-400">{create.error.message}</p>
      )}

      <Button type="submit" disabled={create.isPending} className="self-start">
        {create.isPending ? "Saving..." : "Create Market Config"}
      </Button>
    </form>
  );
}
