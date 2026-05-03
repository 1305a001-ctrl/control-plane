import { ScaffoldPage } from "../_components/scaffold-page";

/**
 * /forex — drill-down for FX (OANDA paper → IC Markets cTrader live).
 *
 * Wires to (Phase 5b): OANDA adapter, IC Markets cTrader adapter, EODHD
 * data, CFTC COT, CME FedWatch, OANDA order-book sentiment.
 */
export default function ForexPage() {
  return (
    <ScaffoldPage
      title="Forex"
      subtitle="OANDA paper → IC Markets cTrader live · 24/5 · macro-event-driven + session-driven"
      status="blocked"
      sections={[
        {
          title: "Open positions",
          description: "From trades table where asset_class = forex",
          placeholder: "blocked: needs OANDA demo account (Tier C, ~10 min)",
        },
        {
          title: "Session overview",
          description: "Asia / EU / US trading session activity",
          placeholder: "wired in Phase 5b — display from market hours scheduler",
        },
        {
          title: "COT positioning (CFTC, weekly)",
          description: "Specs net position vs historical extremes",
          placeholder: "in progress — CFTC COT puller is part of Phase 1.5 macro layer",
        },
        {
          title: "Central bank calendar",
          description: "FOMC / ECB / BoE / BoJ / BNM scheduled statements",
          placeholder: "wired in Phase 1.5 (macro intelligence pulled forward)",
        },
      ]}
    />
  );
}
