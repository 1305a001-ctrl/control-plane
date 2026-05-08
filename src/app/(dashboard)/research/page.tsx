/**
 * /research — source + strategy + horizon scorecards.
 *
 * Reads `signal_outcomes` (populated daily by outcome-scorer) and joins
 * via market_signals.source_article_ids[] to attribute outcomes back to
 * the news source that produced them.
 *
 * The point: tell us which sources / strategies / horizons actually
 * predict moves. Currently we run 6+ news sources — we don't yet know
 * which are pulling weight.
 */
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 7;
const MIN_DECISIVE_FOR_RANKING = 5; // below this, hit rate is statistical noise


export default async function ResearchPage() {
  const [bySource, byStrategy, byHorizon] = await Promise.all([
    api.research.bySource({ lookbackDays: LOOKBACK_DAYS }),
    api.research.byStrategy({ lookbackDays: LOOKBACK_DAYS }),
    api.research.byHorizon({ lookbackDays: LOOKBACK_DAYS }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Research</h1>
        <p className="text-sm text-gray-400">
          Signal-quality + source-quality scorecards over the last{" "}
          {LOOKBACK_DAYS} days. Hit rate excludes flats; rankings shown
          only for sources/strategies with ≥{MIN_DECISIVE_FOR_RANKING}{" "}
          decisive outcomes.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          By news source ({bySource.length})
        </h2>
        {bySource.length === 0 ? (
          <p className="text-sm text-gray-500">No outcomes scored yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Signals</TableHead>
                <TableHead className="text-right">Outcomes</TableHead>
                <TableHead className="text-right">Wins</TableHead>
                <TableHead className="text-right">Losses</TableHead>
                <TableHead className="text-right">Flats</TableHead>
                <TableHead className="text-right">Hit rate</TableHead>
                <TableHead className="text-right">Avg Δ%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySource.map((s) => {
                const decisive = s.wins + s.losses;
                const hitRate = decisive > 0 ? s.wins / decisive : 0;
                const tier = decisive >= MIN_DECISIVE_FOR_RANKING ? "ok" : "noise";
                return (
                  <TableRow key={s.source}>
                    <TableCell className="font-mono">{s.source}</TableCell>
                    <TableCell className="text-right">{s.signalCount}</TableCell>
                    <TableCell className="text-right">{s.outcomeCount}</TableCell>
                    <TableCell className="text-right text-green-400">{s.wins}</TableCell>
                    <TableCell className="text-right text-red-400">{s.losses}</TableCell>
                    <TableCell className="text-right text-gray-500">{s.flats}</TableCell>
                    <TableCell className="text-right">
                      <RateCell rate={hitRate} tier={tier} />
                    </TableCell>
                    <TableCell className="text-right">
                      {s.avgPriceChange === null
                        ? "—"
                        : fmtPct(s.avgPriceChange)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          By strategy ({byStrategy.length})
        </h2>
        {byStrategy.length === 0 ? (
          <p className="text-sm text-gray-500">No outcomes scored yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Strategy</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Outcomes</TableHead>
                <TableHead className="text-right">W / L / F</TableHead>
                <TableHead className="text-right">Hit rate</TableHead>
                <TableHead className="text-right">Avg Δ%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byStrategy.map((s) => {
                const decisive = s.wins + s.losses;
                const hitRate = decisive > 0 ? s.wins / decisive : 0;
                const tier = decisive >= MIN_DECISIVE_FOR_RANKING ? "ok" : "noise";
                return (
                  <TableRow key={s.slug}>
                    <TableCell className="font-mono">{s.slug}</TableCell>
                    <TableCell>
                      {s.type ? <Badge variant="outline">{s.type}</Badge> : "—"}
                    </TableCell>
                    <TableCell>
                      {s.bucket ? <Badge variant="secondary">{s.bucket}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-right">{s.outcomeCount}</TableCell>
                    <TableCell className="text-right text-xs">
                      <span className="text-green-400">{s.wins}</span>
                      {" / "}
                      <span className="text-red-400">{s.losses}</span>
                      {" / "}
                      <span className="text-gray-500">{s.flats}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <RateCell rate={hitRate} tier={tier} />
                    </TableCell>
                    <TableCell className="text-right">
                      {s.avgPriceChange === null
                        ? "—"
                        : fmtPct(s.avgPriceChange)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          By evaluation horizon ({byHorizon.length})
        </h2>
        {byHorizon.length === 0 ? (
          <p className="text-sm text-gray-500">No outcomes scored yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horizon</TableHead>
                <TableHead className="text-right">Outcomes</TableHead>
                <TableHead className="text-right">W / L / F</TableHead>
                <TableHead className="text-right">Hit rate</TableHead>
                <TableHead className="text-right">Avg Δ%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byHorizon.map((h) => {
                const decisive = h.wins + h.losses;
                const hitRate = decisive > 0 ? h.wins / decisive : 0;
                return (
                  <TableRow key={h.horizon}>
                    <TableCell className="font-mono">{h.horizon}</TableCell>
                    <TableCell className="text-right">{h.outcomeCount}</TableCell>
                    <TableCell className="text-right text-xs">
                      <span className="text-green-400">{h.wins}</span>
                      {" / "}
                      <span className="text-red-400">{h.losses}</span>
                      {" / "}
                      <span className="text-gray-500">{h.flats}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {decisive >= MIN_DECISIVE_FOR_RANKING
                        ? `${(hitRate * 100).toFixed(0)}%`
                        : <span className="text-xs text-gray-500" title={`needs ${MIN_DECISIVE_FOR_RANKING - decisive} more decisive`}>n/a</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {h.avgPriceChange === null ? "—" : fmtPct(h.avgPriceChange)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}


function RateCell({ rate, tier }: { rate: number; tier: "ok" | "noise" }) {
  if (tier === "noise") {
    return (
      <span
        className="text-xs text-gray-500"
        title={`<${MIN_DECISIVE_FOR_RANKING} decisive outcomes — too few for stat significance`}
      >
        n/a
      </span>
    );
  }
  const tone =
    rate >= 0.6
      ? "text-green-400"
      : rate >= 0.45
        ? "text-yellow-400"
        : "text-red-400";
  return <span className={tone}>{(rate * 100).toFixed(0)}%</span>;
}


function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(2)}%`;
}
