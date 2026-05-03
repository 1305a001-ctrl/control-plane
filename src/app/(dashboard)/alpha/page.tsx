import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/server";

/**
 * /alpha — alpha sources + macro positioning.
 *
 * Today: CFTC COT positioning (live from macro_events table populated by
 * macro-pullers). Each instrument's latest specs_net + z-score + extreme
 * label.
 *
 * Future (Phase 6): Discord/Telegram source list with rolling Sharpe per
 * source from source_scores table; LLM-extracted signals from news:incoming.
 */
export default async function AlphaPage() {
  const [latestPerInstrument, extremes] = await Promise.all([
    api.macro.latestPerInstrument({ source: "cftc-cot", limit: 20 }),
    api.macro.extremes({
      source: "cftc-cot",
      minAbsZ: 2,
      sinceDays: 90,
      limit: 30,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alpha sources</h1>
        <p className="text-sm text-gray-400">
          CFTC COT positioning live · Discord/Telegram sources pending Phase 6 ·
          v0.1.0 = positioning extremes only; weighted alpha-fusion comes when
          alphas:active stream is live
        </p>
      </div>

      {/* Extreme readings — the actionable headline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Extreme positioning (|z| ≥ 2, last 90 days)
          </CardTitle>
          <CardDescription>
            Specs at extremes often precede mean reversions. Treat as ONE input,
            not standalone trigger. From cftc-cot via macro-pullers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {extremes.length === 0 ? (
            <p className="text-sm italic text-gray-500">
              no extreme readings — no markets at &gt;2σ positioning
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Z-score</TableHead>
                  <TableHead>Reading</TableHead>
                  <TableHead>Specs net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extremes.map((e) => {
                  const payload = (e.payload ?? {}) as {
                    specs_net?: number;
                  };
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(e.eventAt).toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {e.instrument}
                      </TableCell>
                      <TableCell
                        className={
                          e.interpretation === "extreme-long"
                            ? "font-mono text-green-400"
                            : "font-mono text-red-400"
                        }
                      >
                        {e.surpriseScore?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.interpretation === "extreme-long"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {e.interpretation}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payload.specs_net?.toLocaleString() ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Latest positioning per instrument */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Latest positioning per instrument
          </CardTitle>
          <CardDescription>
            Most recent COT report for each tracked market
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestPerInstrument.length === 0 ? (
            <p className="text-sm italic text-gray-500">
              no data yet — macro-pullers cot job hasn&apos;t fetched
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Report date</TableHead>
                  <TableHead>Z</TableHead>
                  <TableHead>Reading</TableHead>
                  <TableHead>Specs net</TableHead>
                  <TableHead>Specs long</TableHead>
                  <TableHead>Specs short</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestPerInstrument.map((e) => {
                  const p = (e.payload ?? {}) as {
                    specs_net?: number;
                    specs_long?: number;
                    specs_short?: number;
                  };
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-semibold">
                        {e.instrument}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {new Date(e.eventAt).toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell
                        className={
                          (e.surpriseScore ?? 0) > 0
                            ? "font-mono text-green-400"
                            : (e.surpriseScore ?? 0) < 0
                              ? "font-mono text-red-400"
                              : "font-mono"
                        }
                      >
                        {e.surpriseScore?.toFixed(2) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.interpretation === "extreme-long"
                              ? "default"
                              : e.interpretation === "extreme-short"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {e.interpretation ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.specs_net?.toLocaleString() ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.specs_long?.toLocaleString() ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.specs_short?.toLocaleString() ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Discord/Telegram sources — pending */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Discord / Telegram alpha sources
          </CardTitle>
          <CardDescription>
            pending Phase 6 — needs ingester + LLM extractor + per-source
            scorer (no Tier C creds blocked, but separate sprint)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm italic text-gray-500">
            no sources registered. When Phase 6 ships:
          </p>
          <ul className="ml-4 mt-2 list-disc text-sm text-gray-400">
            <li>register Discord channels via webhook permissions</li>
            <li>register Telegram channels via bot/group access</li>
            <li>
              LLM filter classifies each message → publishes alpha to{" "}
              <code className="text-xs">alphas:active</code> redis stream
            </li>
            <li>
              per-source rolling Sharpe (30/90 day) auto-mutes sources with
              negative edge
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
