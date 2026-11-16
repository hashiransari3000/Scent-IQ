import { cn } from "@/lib/utils";

const ROWS = [
  { key: "topNotes", label: "Top", hint: "First impression" },
  { key: "heartNotes", label: "Heart", hint: "The character" },
  { key: "baseNotes", label: "Base", hint: "What lingers" },
] as const;

export function NotePyramid({
  topNotes,
  heartNotes,
  baseNotes,
  accent = "#C8963E",
  className,
}: {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  accent?: string;
  className?: string;
}) {
  const data = { topNotes, heartNotes, baseNotes };
  return (
    <div className={cn("space-y-5", className)}>
      {ROWS.map((row, index) => {
        const notes = data[row.key];
        if (!notes.length) return null;
        return (
          <div key={row.key} className="grid grid-cols-[64px_1fr] gap-4">
            <div className="relative">
              <div className="flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: accent, opacity: 1 - index * 0.22 }}
                />
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/55">
                  {row.label}
                </span>
              </div>
              <p className="mt-1 text-[0.56rem] uppercase tracking-[0.12em] text-ink/32">
                {row.hint}
              </p>
              {index < ROWS.length - 1 && (
                <span className="absolute left-[3px] top-4 h-[calc(100%+8px)] w-px bg-ink/12" />
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {notes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-ink/10 bg-ivory-soft px-2.5 py-1 text-[0.68rem] text-ink/75"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
