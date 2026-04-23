"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

const WATCHLIST_ASSETS = [
  "BTC", "ETH", "SOL", "DOGE", "PEPE",
  "NVDA", "AAPL",
  "VTI", "VOO", "VXUS",
  "1155", "5347",
];

export default function NewTradingConfigPage() {
  const router = useRouter();
  const create = api.agentConfigs.createTrading.useMutation({
    onSuccess: () => router.push("/trading"),
  });

  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    enabled: true,
    position_size_pct: 0.05,
    max_open_positions: 3,
    take_profit_pct: 0.08,
    stop_loss_pct: 0.04,
    min_signal_confidence: 0.70,
    max_daily_trades: 2,
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
        position_size_pct: form.position_size_pct,
        max_open_positions: form.max_open_positions,
        take_profit_pct: form.take_profit_pct,
        stop_loss_pct: form.stop_loss_pct,
        min_signal_confidence: form.min_signal_confidence,
        max_daily_trades: form.max_daily_trades,
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
          ← Trading Agent
        </button>
        <h1 className="text-xl font-semibold">New Trading Config</h1>
        <p className="text-sm text-gray-400">Configure risk parameters for one asset.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Asset</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {WATCHLIST_ASSETS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setForm((f) => ({ ...f, slug: a, name: f.name || `${a} Trading Config` }))}
              className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                form.slug === a
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <Input placeholder="Or type custom symbol e.g. BTC" {...field("slug")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Name</Label>
        <Input placeholder="e.g. BTC Trading Config" {...field("name")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Description <span className="text-xs text-gray-500">(optional)</span></Label>
        <Input placeholder="One-liner description" {...field("description")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Position Size % <span className="text-xs text-gray-500">e.g. 0.05 = 5%</span></Label>
          <Input type="number" step="0.01" min="0.001" max="1" {...field("position_size_pct")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Max Open Positions</Label>
          <Input type="number" step="1" min="1" max="20" {...field("max_open_positions")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Take Profit % <span className="text-xs text-green-500">+gain</span></Label>
          <Input type="number" step="0.01" min="0.001" max="1" {...field("take_profit_pct")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Stop Loss % <span className="text-xs text-red-500">-loss</span></Label>
          <Input type="number" step="0.01" min="0.001" max="1" {...field("stop_loss_pct")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Min Signal Confidence</Label>
          <Input type="number" step="0.05" min="0" max="1" {...field("min_signal_confidence")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Max Daily Trades</Label>
          <Input type="number" step="1" min="1" max="50" {...field("max_daily_trades")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Notes <span className="text-xs text-gray-500">(optional)</span></Label>
        <Textarea placeholder="Any notes about this config..." {...field("notes")} />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={form.enabled}
          onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="enabled">Enabled (agent will trade this asset)</Label>
      </div>

      {create.error && (
        <p className="text-sm text-red-400">{create.error.message}</p>
      )}

      <Button type="submit" disabled={create.isPending} className="self-start">
        {create.isPending ? "Saving..." : "Create Config"}
      </Button>
    </form>
  );
}
