import { ScaffoldPage } from "../_components/scaffold-page";

/**
 * /alpha — Discord/Telegram source list with rolling Sharpe per source.
 *
 * Wires to (Phase 6): Discord ingester (ai-staging), Telegram ingester
 * (ai-staging), LLM signal extractor (ai-edge qwen 7b OR Claude haiku),
 * per-source scorer.
 *
 * Reads from source_scores table (added in migration 009) + alphas_active
 * table for the fused output.
 */
export default function AlphaPage() {
  return (
    <ScaffoldPage
      title="Alpha sources"
      subtitle="Discord + Telegram + X + RSS · LLM-filtered · per-source rolling Sharpe weights contributions"
      status="blocked"
      sections={[
        {
          title: "Active sources",
          description: "All registered sources with current weight + last-30d Sharpe",
          placeholder: "blocked: needs source registration UI + Phase 6 ingester deployed",
        },
        {
          title: "Signals extracted today",
          description: "From news:incoming → LLM filter → alphas:active",
          placeholder: "blocked: Phase 6 ingester + LLM extractor not deployed",
        },
        {
          title: "Source contribution to wins / losses",
          description: "Per-source attribution of recent strategy P&L",
          placeholder: "blocked: needs alpha-attribution worker (Phase 6 sub-task)",
        },
        {
          title: "Add new source",
          description: "Register a new Discord channel / Telegram group / RSS feed",
          placeholder: "wired in Phase 6 — form posts to source_scores via tRPC",
        },
      ]}
    />
  );
}
