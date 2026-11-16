import type { Perfume } from "@/lib/types";
import { cn } from "@/lib/utils";

type MapItem = Perfume & { match?: number };

export function ScentMap({
  items,
  className,
  labelTop = 5,
}: {
  items: MapItem[];
  className?: string;
  labelTop?: number;
}) {
  const plotted = items.filter(
    (item) => Array.isArray(item.coordinates) && item.coordinates.length === 2,
  );

  if (plotted.length < 3) {
    return (
      <div
        className={cn(
          "grid min-h-52 place-items-center rounded-[1.6rem] border border-ivory/10 bg-ivory/[0.03] p-8 text-center",
          className,
        )}
      >
        <p className="max-w-xs text-[0.78rem] leading-relaxed text-ivory/45">
          The scent map appears once we have a few matches to place. Add a perfume or a note to
          your profile.
        </p>
      </div>
    );
  }

  const xs = plotted.map((item) => item.coordinates![0]);
  const ys = plotted.map((item) => item.coordinates![1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const points = plotted.map((item) => {
    const [x, y] = item.coordinates!;
    return {
      item,
      x: 8 + ((x - minX) / spanX) * 84,
      y: 10 + ((maxY - y) / spanY) * 46,
      r: item.match ? 1.15 + (item.match / 100) * 0.85 : 1.2,
    };
  });

  const ranked = [...points].sort((a, b) => (b.item.match ?? 0) - (a.item.match ?? 0));
  const labelled = new Set(ranked.slice(0, labelTop).map((point) => point.item.id));

  const clusters = new Map<string, { name: string; color: string; count: number }>();
  for (const point of points) {
    const key = String(point.item.clusterId);
    const existing = clusters.get(key);
    if (existing) existing.count += 1;
    else
      clusters.set(key, {
        name: point.item.clusterName,
        color: point.item.clusterColor ?? point.item.familyColor ?? "#C8963E",
        count: 1,
      });
  }
  const legend = [...clusters.values()].sort((a, b) => b.count - a.count).slice(0, 4);

  return (
    <div className={cn("relative overflow-hidden rounded-[1.6rem] border border-ivory/10 bg-ivory/[0.025]", className)}>
      <svg
        viewBox="0 0 100 62"
        className="h-auto w-full"
        role="img"
        aria-label={`Scent map with ${plotted.length} recommended perfumes`}
      >
        <defs>
          <radialGradient id="map-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#C8963E" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#C8963E" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="62" fill="url(#map-glow)" />
        {[12, 23, 34, 45].map((y) => (
          <line
            key={y}
            x1="4"
            x2="96"
            y1={y}
            y2={y}
            stroke="rgba(245,240,230,0.06)"
            strokeWidth="0.2"
            strokeDasharray="0.8 2"
          />
        ))}
        {[18, 39, 60, 81].map((x) => (
          <line
            key={x}
            y1="6"
            y2="58"
            x1={x}
            x2={x}
            stroke="rgba(245,240,230,0.045)"
            strokeWidth="0.2"
          />
        ))}
        <ellipse cx="50" cy="33" rx="43" ry="26" fill="none" stroke="rgba(245,240,230,0.09)" strokeWidth="0.22" />
        <ellipse cx="50" cy="33" rx="28" ry="17" fill="none" stroke="rgba(245,240,230,0.07)" strokeWidth="0.2" strokeDasharray="1 2" />

        {points.map((point) => {
          const isTop = labelled.has(point.item.id);
          return (
            <g key={point.item.id}>
              {isTop && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={point.r + 1.4}
                  fill="none"
                  stroke={point.item.clusterColor ?? "#C8963E"}
                  strokeOpacity="0.35"
                  strokeWidth="0.28"
                />
              )}
              <circle
                cx={point.x}
                cy={point.y}
                r={point.r}
                fill={point.item.clusterColor ?? point.item.familyColor ?? "#C8963E"}
                fillOpacity={point.item.match ? 0.92 : 0.55}
                stroke="rgba(245,240,230,0.65)"
                strokeWidth="0.22"
              >
                <title>
                  {point.item.name} · {point.item.house}
                  {point.item.match ? ` · ${point.item.match}% match` : ""}
                </title>
              </circle>
              {labelled.has(point.item.id) && (
                <text
                  x={point.x + point.r + 1.5}
                  y={point.y + 1}
                  fontSize="2.1"
                  fill="rgba(245,240,230,0.82)"
                  stroke="rgba(14,13,11,0.55)"
                  strokeWidth="0.5"
                  paintOrder="stroke"
                >
                  {point.item.name.length > 18 ? `${point.item.name.slice(0, 17)}…` : point.item.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-ivory/35">
          Note-family space · PCA projection
        </span>
        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-ivory/35">
          {plotted.length} placed
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-ivory/8 px-4 py-3">
        {legend.map((cluster) => (
          <span key={cluster.name} className="inline-flex items-center gap-1.5 text-[0.58rem] text-ivory/45">
            <span className="size-1.5 rounded-full" style={{ background: cluster.color }} />
            {cluster.name}
          </span>
        ))}
      </div>
    </div>
  );
}
