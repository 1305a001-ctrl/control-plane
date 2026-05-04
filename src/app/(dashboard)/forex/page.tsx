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
import { classifyAsset } from "~/lib/asset-class";
import { api } from "~/trpc/server";

/**
 * /forex — placeholder until OANDA demo + EODHD are wired (Phase 5b).
 * Filters trades that look like FX pairs (e.g. EUR/USD, EURUSD).
 *
 * Macro context comes from cb_statements + (pending) fedwatch v0.2.0
 * surfaced on /alpha; FX pairs respond strongly to those events so this
 * page links to /alpha until live FX positions are taken.
 */
export default async function ForexPage() {
  const all = await api.trades.list({ limit: 100 });
  const fxTrades = all.filter((t) => classifyAsset(t.asset) === "forex");
  const upcoming = await api.macro.upcomingStatements({
    daysAhead: 30,
    limit: 8,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forex</h1>
        <p className="text-sm text-gray-400">
          OANDA paper → IC Markets cTrader live · 24/5 · macro-event-driven ·{" "}
          {fxTrades.length === 0
            ? "no FX positions yet (waits on Phase 5b)"
            : `${fxTrades.length} positions`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Open FX positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fxTrades.length === 0 ? (
            <p className="text-sm italic text-gray-500">
              no FX positions yet — Phase 5b unlocks once OANDA demo + EODHD
              are set up
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Size USD</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fxTrades.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.asset}</TableCell>
                    <TableCell>
                      <Badge>{t.direction}</Badge>
                    </TableCell>
                    <TableCell>${t.sizeUsd.toFixed(0)}</TableCell>
                    <TableCell>{t.entryPrice?.toFixed(4) ?? "—"}</TableCell>
                    <TableCell className="text-xs">{t.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Macro events affecting FX (next 30 days)
          </CardTitle>
          <CardDescription>
            Central bank statements drive FX. From cb_statements puller —
            same data you see at /dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm italic text-gray-500">none in window</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {upcoming.map((e) => {
                const days = Math.ceil(
                  (new Date(e.eventAt).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                );
                return (
                  <li key={e.id} className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-gray-500">
                      {new Date(e.eventAt).toISOString().slice(0, 10)}
                    </span>
                    <span className="font-semibold uppercase">
                      {e.source.replace("-statement", "")}
                    </span>
                    <span
                      className={
                        days <= 7 ? "text-amber-400 text-xs" : "text-gray-500 text-xs"
                      }
                    >
                      in {days}d
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
