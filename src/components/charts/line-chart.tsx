/**
 * Tiny dependency-free SVG line chart for /performance equity + drawdown
 * curves. Built inline rather than pulling in recharts/nivo because:
 *   - no new bundle bloat
 *   - the shape is dead simple (1 series, no axes interaction)
 *   - dark-theme tone-matched to the rest of the dashboard
 *
 * If we ever need richer interactivity (zoom, hover tooltips, multiple
 * series), swap to recharts; right now this is ~80 lines and sufficient.
 */
"use client";

type Point = { ts: Date | string; value: number };

export type LineChartProps = {
  data: Point[];
  /** "green" → up-good (PnL), "red" → down-good (drawdown). */
  tone?: "green" | "red" | "neutral";
  height?: number;
  /** Format helper for the latest-value badge. */
  fmt?: (n: number) => string;
  /** Caption shown above the chart (e.g. "Equity since paper-start"). */
  caption?: string;
};

const W = 600;
const PAD = { top: 12, right: 16, bottom: 24, left: 48 };

function tonePalette(tone: LineChartProps["tone"]) {
  if (tone === "red") {
    return { stroke: "#f87171", fill: "rgba(248,113,113,0.10)" };
  }
  if (tone === "green") {
    return { stroke: "#4ade80", fill: "rgba(74,222,128,0.10)" };
  }
  return { stroke: "#94a3b8", fill: "rgba(148,163,184,0.10)" };
}

export function LineChart({
  data,
  tone = "neutral",
  height = 200,
  fmt = (n) => n.toFixed(2),
  caption,
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded border border-gray-800 bg-gray-900/40 text-xs text-gray-500"
        style={{ height }}
      >
        no data yet
      </div>
    );
  }
  const palette = tonePalette(tone);
  const xs = data.map((d) => new Date(d.ts).getTime());
  const ys = data.map((d) => d.value);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0);
  const yMax = Math.max(...ys, 0);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const w = W - PAD.left - PAD.right;
  const h = height - PAD.top - PAD.bottom;

  const points = data.map((d, i) => {
    const x = PAD.left + ((xs[i]! - xMin) / xRange) * w;
    const y = PAD.top + h - ((ys[i]! - yMin) / yRange) * h;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points.at(-1)![0]!.toFixed(1)} ${PAD.top + h} L ${points[0]![0]!.toFixed(1)} ${PAD.top + h} Z`;

  // y-axis tick labels — show min, zero (if in range), and max
  const ticks = [yMin, 0, yMax].filter(
    (v, i, arr) => arr.indexOf(v) === i && v >= yMin && v <= yMax,
  );

  const latest = ys.at(-1)!;
  const latestColor =
    tone === "red" || latest < 0
      ? "text-red-400"
      : tone === "green" || latest > 0
        ? "text-green-400"
        : "text-gray-400";

  return (
    <div className="rounded border border-gray-800 bg-gray-900/40 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        {caption && (
          <span className="text-xs uppercase tracking-wide text-gray-400">
            {caption}
          </span>
        )}
        <span className={`text-sm font-mono ${latestColor}`}>{fmt(latest)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
      >
        {/* zero line */}
        {yMin < 0 && yMax > 0 && (
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + h - ((0 - yMin) / yRange) * h}
            y2={PAD.top + h - ((0 - yMin) / yRange) * h}
            stroke="#374151"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}
        {/* y-axis tick labels */}
        {ticks.map((v) => {
          const y = PAD.top + h - ((v - yMin) / yRange) * h;
          return (
            <text
              key={v}
              x={PAD.left - 4}
              y={y + 4}
              fontSize={10}
              fill="#94a3b8"
              textAnchor="end"
            >
              {fmt(v)}
            </text>
          );
        })}
        {/* area fill */}
        <path d={areaPath} fill={palette.fill} />
        {/* line */}
        <path
          d={linePath}
          fill="none"
          stroke={palette.stroke}
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
