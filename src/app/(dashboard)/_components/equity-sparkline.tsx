/**
 * Server-rendered equity-curve sparkline.
 *
 * Pure SVG; no JS, no client component. Takes a list of risk_ledger
 * snapshots (any recent shape with `pnlUsd` + `snapshotAt`) and draws
 * a polyline.
 */
type Snapshot = {
  snapshotAt: Date | string;
  pnlUsd: number;
};

export function EquitySparkline({
  snapshots,
  width = 320,
  height = 60,
  baseline = 10_000,
}: {
  snapshots: Snapshot[];
  width?: number;
  height?: number;
  baseline?: number;
}) {
  if (snapshots.length < 2) {
    return (
      <p className="text-xs italic text-gray-500">
        not enough snapshots yet (need ≥2)
      </p>
    );
  }

  // Sort oldest-first
  const sorted = [...snapshots].sort((a, b) => {
    const ta = new Date(a.snapshotAt).getTime();
    const tb = new Date(b.snapshotAt).getTime();
    return ta - tb;
  });

  const values = sorted.map((s) => baseline + s.pnlUsd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  // Map values → SVG points
  const stepX = width / (sorted.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = values[values.length - 1] ?? baseline;
  const first = values[0] ?? baseline;
  const direction = last >= first ? "up" : "down";
  const stroke = direction === "up" ? "rgb(74 222 128)" : "rgb(248 113 113)"; // green-400 / red-400

  return (
    <div className="flex items-baseline gap-3">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label="Equity sparkline"
      >
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          points={points.join(" ")}
        />
      </svg>
      <span className="text-xs text-gray-500">
        last {sorted.length} snapshots · range $
        {min.toFixed(0)}–${max.toFixed(0)}
      </span>
    </div>
  );
}
