"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

export function KillSwitchControls() {
  const utils = api.useUtils();
  const status = api.kill.redisStatus.useQuery(undefined, {
    refetchInterval: 5000, // poll every 5s
  });

  const [strategySlug, setStrategySlug] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const haltAll = api.kill.haltAll.useMutation({
    onSettled: () => {
      void utils.kill.redisStatus.invalidate();
      void utils.kill.recent.invalidate();
      setBusy(null);
    },
  });
  const haltStrategy = api.kill.haltStrategy.useMutation({
    onSettled: () => {
      void utils.kill.redisStatus.invalidate();
      void utils.kill.recent.invalidate();
      setBusy(null);
    },
  });
  const resume = api.kill.resume.useMutation({
    onSettled: () => {
      void utils.kill.redisStatus.invalidate();
      void utils.kill.recent.invalidate();
      setBusy(null);
    },
  });
  const flat = api.kill.flat.useMutation({
    onSettled: () => {
      void utils.kill.redisStatus.invalidate();
      void utils.kill.recent.invalidate();
      setBusy(null);
    },
  });
  const resetTomorrow = api.kill.resetTomorrow.useMutation({
    onSettled: () => {
      void utils.kill.redisStatus.invalidate();
      void utils.kill.recent.invalidate();
      setBusy(null);
    },
  });

  const confirmAndCall = (
    label: string,
    fire: () => void,
  ) => () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Confirm: ${label}?`)
    ) {
      return;
    }
    setBusy(label);
    fire();
  };

  const liveStatus = status.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Manual controls (L5)
        </CardTitle>
        <CardDescription>
          Mirror of pa-agent Telegram commands. All emissions go through redis
          stream <code>risk:alerts</code> → kill_persister → kill_events audit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live state */}
        <div className="rounded border border-gray-700 bg-gray-900/40 p-3 text-sm">
          <p className="font-semibold mb-1">Live halt state</p>
          {!liveStatus ? (
            <p className="text-xs italic text-gray-500">loading...</p>
          ) : (
            <ul className="space-y-1 text-xs">
              <li>
                Global halt:{" "}
                <span
                  className={
                    liveStatus.globalHalt ? "text-red-400" : "text-green-400"
                  }
                >
                  {liveStatus.globalHalt ? "🛑 SET" : "✓ clear"}
                </span>
              </li>
              <li>
                Auto-resume scheduled:{" "}
                <span className="text-gray-400">
                  {liveStatus.resetAt ?? "—"}
                </span>
              </li>
              <li>
                Strategy halts ({liveStatus.strategyHalts.length}):{" "}
                <span className="font-mono text-amber-400">
                  {liveStatus.strategyHalts.join(", ") || "none"}
                </span>
              </li>
            </ul>
          )}
        </div>

        {/* Big buttons row */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Button
            variant="destructive"
            disabled={busy !== null || haltAll.isPending}
            onClick={confirmAndCall("HALT ALL", () =>
              haltAll.mutate(undefined),
            )}
          >
            🛑 Halt all
          </Button>
          <Button
            variant="default"
            disabled={busy !== null || resume.isPending}
            onClick={confirmAndCall("RESUME (clear global halt)", () =>
              resume.mutate(undefined),
            )}
          >
            ▶️ Resume
          </Button>
          <Button
            variant="destructive"
            disabled={busy !== null || flat.isPending}
            onClick={confirmAndCall(
              "FLAT (close ALL open positions to flat — destructive)",
              () => flat.mutate(undefined),
            )}
          >
            ⚠ Flat all
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null || resetTomorrow.isPending}
            onClick={confirmAndCall(
              "RESET-TOMORROW (auto-clear at 04:00 +08)",
              () => resetTomorrow.mutate(undefined),
            )}
          >
            ⏰ Auto-resume tomorrow
          </Button>
        </div>

        {/* Per-strategy halt */}
        <div className="space-y-2 rounded border border-gray-700 bg-gray-900/40 p-3">
          <Label htmlFor="strategy-slug" className="text-sm font-semibold">
            Halt one strategy
          </Label>
          <div className="flex gap-2">
            <Input
              id="strategy-slug"
              placeholder="e.g. btc-momentum"
              value={strategySlug}
              onChange={(e) => setStrategySlug(e.target.value)}
              className="font-mono text-sm"
            />
            <Button
              variant="destructive"
              disabled={
                busy !== null ||
                haltStrategy.isPending ||
                strategySlug.trim() === ""
              }
              onClick={confirmAndCall(
                `HALT-STRATEGY ${strategySlug}`,
                () =>
                  haltStrategy.mutate({
                    slug: strategySlug.trim().toLowerCase(),
                  }),
              )}
            >
              🛑 Halt
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Sets <code>system:halt:&lt;slug&gt;</code> in Redis. Clear with
            global Resume.
          </p>
        </div>

        {/* Last action result */}
        {(haltAll.data ||
          haltStrategy.data ||
          resume.data ||
          flat.data ||
          resetTomorrow.data) && (
          <p className="text-xs text-green-400">✓ last action ok</p>
        )}
        {(haltAll.error ||
          haltStrategy.error ||
          resume.error ||
          flat.error ||
          resetTomorrow.error) && (
          <p className="text-xs text-red-400">
            ❌{" "}
            {haltAll.error?.message ??
              haltStrategy.error?.message ??
              resume.error?.message ??
              flat.error?.message ??
              resetTomorrow.error?.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
