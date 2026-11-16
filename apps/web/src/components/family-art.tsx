import { cn } from "@/lib/utils";
import { familyVisual, hashString } from "@/lib/visuals";

export function FamilyArt({
  slug,
  name,
  seed,
  className,
  overlay = true,
  label = true,
}: {
  slug?: string | null;
  name?: string;
  seed?: string;
  className?: string;
  overlay?: boolean;
  label?: boolean;
}) {
  const visual = familyVisual(slug);
  const hash = hashString(seed ?? name ?? slug ?? "scentiq");
  const cx = 30 + (hash % 42);
  const cy = 30 + ((hash >> 3) % 34);
  const rotation = (hash % 40) - 20;

  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{
        background: `linear-gradient(148deg, ${visual.start} 0%, ${visual.end} 100%)`,
      }}
    >
      <div
        className="absolute -right-10 -top-12 size-48 rounded-full opacity-45 blur-2xl"
        style={{ background: visual.accent }}
      />
      <div
        className="absolute -bottom-16 -left-10 size-44 rounded-full opacity-25 blur-2xl"
        style={{ background: visual.start }}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full opacity-70"
        aria-hidden="true"
        style={{ transform: `rotate(${rotation * 0.15}deg) scale(1.06)` }}
      >
        <defs>
          <linearGradient id={`line-${hash}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={visual.accent} stopOpacity="0.85" />
            <stop offset="100%" stopColor={visual.accent} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {[34, 27, 20, 13].map((radius, index) => (
          <ellipse
            key={radius}
            cx={cx}
            cy={cy}
            rx={radius}
            ry={radius * 0.58}
            fill="none"
            stroke={`url(#line-${hash})`}
            strokeWidth={index === 0 ? 0.5 : 0.34}
            strokeDasharray={index === 1 ? "1.4 4" : undefined}
            transform={`rotate(${rotation} ${cx} ${cy})`}
          />
        ))}
        <path
          d={`M ${cx} ${cy - 16} L ${cx} ${cy + 24}`}
          stroke={visual.accent}
          strokeOpacity="0.35"
          strokeWidth="0.35"
        />
        <circle cx={cx} cy={cy} r="2.2" fill={visual.accent} fillOpacity="0.9" />
        <circle cx={cx} cy={cy} r="5.5" fill="none" stroke={visual.accent} strokeOpacity="0.35" strokeWidth="0.3" />
      </svg>

      {overlay && (
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,7,6,0.72)_0%,rgba(8,7,6,0.06)_58%,transparent_100%)]" />
      )}

      {label && name && (
        <span
          className="absolute left-4 top-4 text-[0.58rem] font-medium uppercase tracking-[0.2em]"
          style={{ color: visual.ink, opacity: 0.72 }}
        >
          {name}
        </span>
      )}
    </div>
  );
}
