import { ScaffoldPage } from "../_components/scaffold-page";

/**
 * /kill-switch — manual L5 controls + view of all halts + recent events.
 *
 * Mirrors pa-agent's Telegram commands but as a UI:
 *   - /halt → button "Halt all"
 *   - /halt-strategy <slug> → dropdown + button
 *   - /resume → button "Resume"
 *   - /flat → button "Close all to flat" (confirmation modal)
 *   - /reset-tomorrow → button "Auto-resume at 04:00 +08"
 *
 * Reads halt state from Redis (system:halt + system:halt:* keys) via tRPC.
 * Writes by publishing to redis stream risk:alerts (same as pa-agent).
 */
export default function KillSwitchPage() {
  return (
    <ScaffoldPage
      title="Kill switch"
      subtitle="Manual L5 controls — Telegram commands mirrored as UI · all events log to risk:alerts stream"
      status="wip"
      sections={[
        {
          title: "Active halts",
          description: "Global + per-strategy + scheduled auto-resume",
          placeholder: "wired in Phase 1F: tRPC route reads from redis (HALT_KEY + system:halt:* SCAN)",
        },
        {
          title: "Manual controls",
          description: "Mirror of /halt /halt-strategy /resume /flat /reset-tomorrow",
          placeholder: "Phase 1F: form posts publish to redis stream + KillEvent emit (same path as pa-agent)",
        },
        {
          title: "Recent kill events",
          description: "Last 100 from kill_events table (full audit, paginated)",
          placeholder: "Phase 1F: needs kill-events persistence worker deployed",
        },
        {
          title: "Kill cascade levels reference",
          description: "L0 pre-trade · L1 SL · L2 strategy · L3 account · L4 system · L5 manual",
          placeholder: "Static reference content — to be added inline next iteration",
        },
      ]}
    />
  );
}
