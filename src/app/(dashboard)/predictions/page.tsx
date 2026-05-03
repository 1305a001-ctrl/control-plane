import { ScaffoldPage } from "../_components/scaffold-page";

/**
 * /predictions — drill-down for prediction markets (Polymarket, Kalshi).
 *
 * Wires to (Phase 3-4): Polymarket CLOB API, Kalshi (read), cross-market
 * correlator emitting signals:cross-market.
 *
 * Existing /poly + /positions pages handle today's paper poly state; this
 * page is the new home for the cross-market layer + Kalshi.
 */
export default function PredictionsPage() {
  return (
    <ScaffoldPage
      title="Predictions"
      subtitle="Polymarket + Kalshi · resolution-bound · E-bucket (cross-market correlations)"
      status="wip"
      sections={[
        {
          title: "Open positions",
          description: "From poly_positions + future kalshi_positions",
          placeholder: "today shows paper poly only (see /positions); Kalshi pending",
        },
        {
          title: "Edge-ranked market list",
          description: "Markets where our prob estimate diverges from market by > X%",
          placeholder: "wired in Phase 4 (cross-market correlator)",
        },
        {
          title: "Cross-market signals fired today",
          description: "Poly → bond / sector ETF / crypto / FX divergences",
          placeholder: "wired in Phase 4 — needs correlator on ai-edge",
        },
        {
          title: "Resolution calendar",
          description: "Markets resolving in next 7 / 30 / 90 days",
          placeholder: "wired in Phase 3 once Polymarket adapter reads markets",
        },
      ]}
    />
  );
}
