/**
 * /positions/[id] — full detail of a single position.
 *
 * Header card with venue/asset/side/PnL summary + a chronological intent
 * timeline showing how the position got opened, scaled-in, partial-closed,
 * etc. Powered by positionsRouter.byId which joins positions + the per-
 * intent rows referenced by intent_ids[].
 */
import { notFound } from "next/navigation";

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

type Props = { params: Promise<{ id: string }> };

export default async function PositionDetailPage({ params }: Props) {
  const { id } = await params;
  const pos = (await api.positions.byId({ id })) as
    | (Record<string, unknown> & {
        intents: Array<Record<string, unknown>>;
      })
    | null;
  if (!pos) notFound();

  const realized = Number(pos.realizedPnlUsd ?? 0);
  const unrealized = Number(pos.unrealizedPnlUsd ?? 0);
  const total = realized + unrealized;
  const isOpen = pos.status === "open";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Position {String(pos.id).slice(0, 8)}
        </div>
        <h1 className="text-xl font-semibold">
          <span className="font-mono">{String(pos.asset)}</span>{" "}
          <Badge variant={isOpen ? "default" : "secondary"} className="ml-1">
            {String(pos.status)}
          </Badge>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {String(pos.venue)} · {String(pos.side)} · strategy{" "}
          <span className="font-mono">
            {pos.strategySlug ? String(pos.strategySlug) : "—"}
          </span>
          {pos.bucket ? (
            <>
              {" "}
              · bucket <Badge variant="outline">{String(pos.bucket)}</Badge>
            </>
          ) : null}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Qty" value={fmtQty(Number(pos.qty))} />
        <Card label="Avg entry" value={fmtPx(Number(pos.avgEntryPrice))} />
        <Card
          label="Mark"
          value={pos.markPrice ? fmtPx(Number(pos.markPrice)) : "—"}
          sublabel={
            pos.markedAt
              ? `marked ${fmtRelative(pos.markedAt as Date)}`
              : "no mark"
          }
        />
        <Card
          label="Avg exit"
          value={pos.avgExitPrice ? fmtPx(Number(pos.avgExitPrice)) : "—"}
        />

        <Card
          label="Realized PnL"
          value={fmtUsd(realized)}
          tone={realized > 0 ? "green" : realized < 0 ? "red" : "neutral"}
        />
        <Card
          label="Unrealized PnL"
          value={isOpen ? fmtUsd(unrealized) : "—"}
          tone={unrealized > 0 ? "green" : unrealized < 0 ? "red" : "neutral"}
          sublabel={isOpen ? "from mark-to-market task" : "position closed"}
        />
        <Card
          label="Total PnL"
          value={fmtUsd(total)}
          tone={total > 0 ? "green" : total < 0 ? "red" : "neutral"}
        />
        <Card label="Fees paid" value={fmtUsd(Number(pos.feesUsd ?? 0))} />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Intent timeline ({pos.intents.length})
          </h2>
          <div className="text-xs text-gray-500">
            opened {fmtAbsolute(pos.openedAt as Date)}
            {pos.closedAt ? ` · closed ${fmtAbsolute(pos.closedAt as Date)}` : ""}
          </div>
        </div>
        {pos.intents.length === 0 ? (
          <p className="text-sm text-gray-500">no intents linked.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Notional $</TableHead>
                <TableHead className="text-right">Fill qty</TableHead>
                <TableHead className="text-right">Fill px</TableHead>
                <TableHead className="text-right">Fees $</TableHead>
                <TableHead>Broker order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.intents.map((it) => {
                const filled = it.status === "filled";
                return (
                  <TableRow key={String(it.id)}>
                    <TableCell className="text-xs text-gray-400">
                      {fmtAbsolute((it.completedAt ?? it.submittedAt ?? it.createdAt) as Date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={it.side === "buy" ? "default" : "secondary"}>
                        {String(it.side)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={filled ? "outline" : "secondary"}>
                        {String(it.status)}
                      </Badge>
                      {it.rejectionReason ? (
                        <div className="text-xs text-red-400">
                          {String(it.rejectionReason)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtUsd(Number(it.notionalUsd ?? 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {it.fillQty != null ? fmtQty(Number(it.fillQty)) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {it.fillPrice != null ? fmtPx(Number(it.fillPrice)) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-gray-400">
                      {fmtUsd(Number(it.feesUsd ?? 0))}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {it.brokerOrderId ? String(it.brokerOrderId).slice(0, 12) : "—"}
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

function Card({
  label,
  value,
  tone = "neutral",
  sublabel,
}: {
  label: string;
  value: string | number;
  tone?: "green" | "red" | "neutral";
  sublabel?: string;
}) {
  const color =
    tone === "green"
      ? "text-green-400"
      : tone === "red"
        ? "text-red-400"
        : "text-gray-100";
  return (
    <div className="rounded border border-gray-800 bg-gray-900/40 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className={`mt-1 font-mono text-lg ${color}`}>{value}</div>
      {sublabel && (
        <div className="mt-0.5 text-xs text-gray-500">{sublabel}</div>
      )}
    </div>
  );
}

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function fmtPx(n: number): string {
  if (n < 1) return n.toFixed(4);
  if (n < 100) return n.toFixed(3);
  return n.toFixed(2);
}

function fmtQty(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 1) return n.toFixed(6);
  if (Math.abs(n) < 100) return n.toFixed(4);
  return n.toFixed(2);
}

function fmtAbsolute(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour12: false,
  });
}

function fmtRelative(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}
