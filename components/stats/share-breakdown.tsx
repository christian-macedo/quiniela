export interface ShareItem {
  key: string;
  /** Legend label for this segment. */
  label: string;
  /** Tailwind background class for the bar/swatch color. */
  colorClass: string;
  /** Integer percentage of the total (segments should sum to 100). */
  percentage: number;
  /** Raw number of predictions in this segment. */
  count: number;
}

/**
 * A stacked proportion bar followed by a legend showing each segment's label,
 * percentage, and prediction count. Shared by the match Odds/Accuracy views and
 * the tournament insights breakdowns.
 */
export function ShareBreakdown({
  items,
  predictionsLabel,
}: {
  items: ShareItem[];
  predictionsLabel: (n: number) => string;
}) {
  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {items.map((item) =>
          item.percentage > 0 ? (
            <div
              key={item.key}
              className={item.colorClass}
              style={{ width: `${item.percentage}%` }}
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-sm ${item.colorClass}`} aria-hidden="true" />
            <span className="flex-1 truncate">{item.label}</span>
            <span className="font-display font-bold tabular-nums">{item.percentage}%</span>
            <span className="w-28 text-right text-sm text-muted-foreground tabular-nums">
              {predictionsLabel(item.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
