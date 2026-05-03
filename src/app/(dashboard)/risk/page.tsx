import { ScaffoldPage } from "../_components/scaffold-page";

/**
 * /risk — full DD breakdown, correlation matrix, exposure by venue.
 *
 * Reads from risk_ledger + correlation_snapshots tables (added in migration
 * 009). Live-updates via SSE from risk-ledger snapshot worker (Phase 1F).
 */
export default function RiskPage() {
  return (
    <ScaffoldPage
      title="Risk"
      subtitle="DD per scope/period · cross-position correlation matrix · exposure by venue"
      status="wip"
      sections={[
        {
          title: "Drawdown breakdown",
          description: "Per trade / day / week / month / total — vs configured limits",
          placeholder: "wired in Phase 1F (risk-ledger snapshot worker drains positions:open + executions:fills into risk_ledger every 1 min)",
        },
        {
          title: "Correlation matrix",
          description: "Heat-map across all open positions (rolling 60 min)",
          placeholder: "wired in Phase 1F (correlation_snapshots worker)",
        },
        {
          title: "Exposure by venue",
          description: "Gross + net exposure across OKX / Bybit / Alpaca / OANDA",
          placeholder: "wired with each venue adapter (Phases 3-5)",
        },
        {
          title: "Kill events history",
          description: "All kill_events rows (full audit log, paginated)",
          placeholder: "wired in Phase 1F (kill-events persistence worker)",
        },
      ]}
    />
  );
}
