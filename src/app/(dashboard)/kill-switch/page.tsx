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

import { KillSwitchControls } from "./_components/kill-switch-controls";

/**
 * /kill-switch — manual L5 controls + view of all halts + recent events.
 *
 * Mirrors pa-agent Telegram commands but as a UI. All button clicks publish
 * a KillEvent to redis stream `risk:alerts`; risk-watcher's kill_persister
 * drains that to kill_events postgres for the durable audit log.
 */
export default async function KillSwitchPage() {
  const recent = await api.kill.recent();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kill switch</h1>
        <p className="text-sm text-gray-400">
          Manual L5 controls — same identity as pa-agent /halt /halt-strategy
          /resume /flat /reset-tomorrow Telegram commands. Confirmation dialog
          on every destructive button.
        </p>
      </div>

      {/* Interactive controls (client component) */}
      <KillSwitchControls />

      {/* Cascade reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Kill cascade reference
          </CardTitle>
          <CardDescription>
            From project_trading_stack.md. Implementation order: L5 (here) →
            L3 (account DD) → L4 (system) → L2 (strategy) → L1 (per-position) →
            L0 (pre-trade gate).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <p>
            <Badge variant="outline">L0</Badge> pre-trade gate — close-of-day
            window, correlation &gt; 0.8, system unhealthy → no new entries
          </p>
          <p>
            <Badge variant="outline">L1</Badge> per-position SL/TP/trailing →
            auto close that one position
          </p>
          <p>
            <Badge variant="outline">L2</Badge> strategy: 2% daily loss → 24h
            pause; 5 consecutive losses → manual unpause
          </p>
          <p>
            <Badge variant="destructive">L3</Badge> account: 5% daily DD → halt
            new entries; 10% weekly → full halt; 15% total → close to flat
          </p>
          <p>
            <Badge variant="destructive">L4</Badge> system: API fail × 3 → halt
            that exchange; postgres/redis down → halt all
          </p>
          <p>
            <Badge>L5</Badge> manual: <code>/halt</code>{" "}
            <code>/halt-strategy</code> <code>/resume</code> <code>/flat</code>{" "}
            <code>/reset-tomorrow</code> — Telegram OR this UI
          </p>
        </CardContent>
      </Card>

      {/* Recent kill events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Recent kill events (last 50)
          </CardTitle>
          <CardDescription>
            Durable audit log from kill_events postgres table (persisted by
            risk-watcher's kill_persister)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm italic text-gray-500">no events yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Cleared</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(e.triggeredAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">L{e.level}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.kind}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.scope}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.actor}
                    </TableCell>
                    <TableCell className="text-xs">{e.reason}</TableCell>
                    <TableCell>
                      {e.clearedAt ? (
                        <span className="text-xs text-gray-500">
                          {new Date(e.clearedAt).toLocaleTimeString()}
                        </span>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          active
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
