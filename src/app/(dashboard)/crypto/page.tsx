import { ScaffoldPage } from "../_components/scaffold-page";

/**
 * /crypto — drill-down for crypto positions, signals, on-chain context.
 *
 * Wires to (Phase 2+): OKX adapter, Bybit adapter, Glassnode (MVRV/SOPR),
 * funding rates feed, on-chain liquidation cascade detector.
 */
export default function CryptoPage() {
  return (
    <ScaffoldPage
      title="Crypto"
      subtitle="OKX + Bybit · 24/7 · D-bucket (cascades) + B-bucket (mean-reversion)"
      status="blocked"
      sections={[
        {
          title: "Open positions",
          description: "From trades table where asset_class = crypto",
          placeholder: "blocked: no live broker yet (need OKX or Bybit API key, TRADE-only)",
        },
        {
          title: "Funding rates",
          description: "Cross-exchange perp funding (BTC, ETH, SOL...)",
          placeholder: "blocked: needs B-bucket strategy + funding feed wired",
        },
        {
          title: "On-chain context",
          description: "Glassnode MVRV / SOPR / exchange flows",
          placeholder: "blocked: needs Glassnode API key (Tier C)",
        },
        {
          title: "Recent fills",
          description: "Last 20 fills via OMS",
          placeholder: "blocked: OMS not deployed (Phase 2)",
        },
      ]}
    />
  );
}
