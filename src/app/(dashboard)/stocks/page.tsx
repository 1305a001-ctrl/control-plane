import { ScaffoldPage } from "../_components/scaffold-page";

/**
 * /stocks — drill-down for US stocks (Alpaca).
 *
 * Wires to (Phase 4): Alpaca adapter, Polygon real-time data, Finviz screener,
 * earnings calendar, gap-down + earnings-surprise strategies.
 */
export default function StocksPage() {
  return (
    <ScaffoldPage
      title="Stocks"
      subtitle="Alpaca paper → live · US market hours · D-bucket (gap bounces) + A-bucket (earnings momentum)"
      status="blocked"
      sections={[
        {
          title: "Open positions",
          description: "From trades table where asset_class = stocks",
          placeholder: "blocked: needs Alpaca paper account (Tier C, ~5 min)",
        },
        {
          title: "Watchlist",
          description: "Pre-screened tickers from Finviz",
          placeholder: "blocked: needs Finviz adapter (Phase 4)",
        },
        {
          title: "Earnings calendar (this week)",
          description: "Tickers with earnings + consensus",
          placeholder: "blocked: needs earnings feed (Polygon or Finviz)",
        },
        {
          title: "Recent fills",
          description: "Last 20 fills",
          placeholder: "blocked: OMS not deployed (Phase 2)",
        },
      ]}
    />
  );
}
