import { Badge } from "@/components/ui/badge";
import type { ScoreDistributionEntry } from "@/lib/utils/match-stats";

// Distinct slice colors (defined in globals.css for both light & dark themes).
const SLICE_COLOR_VARS = [
  "--chart-cat-1",
  "--chart-cat-2",
  "--chart-cat-3",
  "--chart-cat-4",
  "--chart-cat-5",
  "--chart-cat-6",
];
const OTHER_COLOR_VAR = "--chart-cat-other";

/** Show at most this many distinct slices; the remainder is grouped into "Other". */
const MAX_SLICES = 6;

interface DistributionSegment {
  label: string;
  count: number;
  percentage: number;
  isMostCommon: boolean;
  isOther: boolean;
  color: string;
}

/**
 * A donut chart plus an accessible data table (doubling as the chart legend) for a
 * scoreline distribution. The long tail beyond MAX_SLICES is grouped into "Other".
 * Shared by the match statistics card and the tournament insights page.
 */
export function DistributionView({
  distribution,
  total,
  headers,
  mostCommonLabel,
  otherLabel,
  chartLabel,
  centerLabel,
}: {
  distribution: ScoreDistributionEntry[];
  total: number;
  headers: { scoreline: string; count: string; share: string };
  mostCommonLabel: string;
  otherLabel: string;
  chartLabel: string;
  centerLabel: string;
}) {
  // Group the long tail so the donut stays readable.
  const segments: DistributionSegment[] = [];
  if (distribution.length <= MAX_SLICES) {
    distribution.forEach((e, i) => {
      segments.push({
        label: e.label,
        count: e.count,
        percentage: e.percentage,
        isMostCommon: e.isMostCommon,
        isOther: false,
        color: `hsl(var(${SLICE_COLOR_VARS[i]}))`,
      });
    });
  } else {
    const head = distribution.slice(0, MAX_SLICES - 1);
    const tail = distribution.slice(MAX_SLICES - 1);
    head.forEach((e, i) => {
      segments.push({
        label: e.label,
        count: e.count,
        percentage: e.percentage,
        isMostCommon: e.isMostCommon,
        isOther: false,
        color: `hsl(var(${SLICE_COLOR_VARS[i]}))`,
      });
    });
    const tailCount = tail.reduce((sum, e) => sum + e.count, 0);
    segments.push({
      label: otherLabel,
      count: tailCount,
      percentage: total > 0 ? Math.round((tailCount / total) * 100) : 0,
      isMostCommon: false,
      isOther: true,
      color: `hsl(var(${OTHER_COLOR_VAR}))`,
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <DonutChart
        segments={segments}
        total={total}
        centerLabel={centerLabel}
        ariaLabel={chartLabel}
      />

      {/* Accessible data table doubling as the chart legend. */}
      <table className="w-full text-sm sm:flex-1">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th scope="col" className="py-2 text-left font-medium">
              {headers.scoreline}
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              {headers.count}
            </th>
            <th scope="col" className="py-2 pr-1 text-right font-medium">
              {headers.share}
            </th>
          </tr>
        </thead>
        <tbody>
          {segments.map((seg) => (
            <tr key={seg.label} className="border-b last:border-0">
              <th scope="row" className="py-2 text-left font-normal">
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: seg.color }}
                    aria-hidden="true"
                  />
                  <span
                    className={
                      seg.isOther ? "text-muted-foreground" : "font-display font-bold tabular-nums"
                    }
                  >
                    {seg.label}
                  </span>
                  {seg.isMostCommon && (
                    <Badge variant="secondary" className="text-xs">
                      {mostCommonLabel}
                    </Badge>
                  )}
                </span>
              </th>
              <td className="py-2 text-right tabular-nums">{seg.count}</td>
              <td className="py-2 pr-1 text-right tabular-nums text-muted-foreground">
                {seg.percentage}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DonutChart({
  segments,
  total,
  centerLabel,
  ariaLabel,
}: {
  segments: DistributionSegment[];
  total: number;
  centerLabel: string;
  ariaLabel: string;
}) {
  const size = 168;
  const stroke = 30;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // Hairline gap (in user units) between adjacent slices for legibility.
  const gap = segments.length > 1 ? 2 : 0;

  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={ariaLabel}
        // Rotate so the first slice starts at 12 o'clock.
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        {segments.map((seg) => {
          const fraction = total > 0 ? seg.count / total : 0;
          const dash = Math.max(fraction * circumference - gap, 0);
          const circle = (
            <circle
              key={seg.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += fraction * circumference;
          return circle;
        })}
      </svg>
      {/* Center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold tabular-nums">{total}</span>
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}
