export interface DonutSegment {
  /** Used as the React key; not rendered. */
  label: string;
  count: number;
  /** Any CSS color value, e.g. `hsl(var(--success))`. */
  color: string;
}

/**
 * A donut chart rendered from segment counts, with a center readout of the total.
 * Colors are supplied per segment so callers control the palette. Shared by the
 * scoreline distribution view and the tournament outcome breakdowns.
 */
export function DonutChart({
  segments,
  total,
  centerLabel,
  ariaLabel,
  size = 168,
  stroke = 30,
}: {
  segments: DonutSegment[];
  total: number;
  centerLabel: string;
  ariaLabel: string;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // Hairline gap (in user units) between adjacent slices for legibility.
  const gap = segments.filter((s) => s.count > 0).length > 1 ? 2 : 0;

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
