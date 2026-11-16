"use client";

import { Home, Search, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "For you", icon: Sparkles },
  { href: "/catalogue", label: "Browse", icon: Search },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/onboarding")) return null;
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-ivory/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-[62px] flex-col items-center justify-center gap-1 text-[0.62rem] font-medium tracking-wide transition-colors",
                active ? "text-ink" : "text-ink/45",
              )}
            >
              {active && (
                <span className="absolute top-0 h-[2px] w-8 rounded-full bg-amber" />
              )}
              <Icon
                className={cn("size-[19px]", active && "text-amber-dark")}
                strokeWidth={active ? 1.9 : 1.5}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
