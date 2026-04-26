import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,36,0.96),rgba(7,13,22,0.92))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur transition-[transform,box-shadow,border-color] duration-180 hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_30px_82px_rgba(0,0,0,0.34)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatusBadge({
  tone = "blue",
  children,
  className,
}: {
  tone?: "blue" | "green" | "orange" | "slate";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    blue: "border-sky-300/20 bg-sky-300/10 text-sky-100",
    green: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    orange: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    slate: "border-white/10 bg-white/6 text-white/82",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold tracking-[0.14em] uppercase",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-black/16 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/42">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white/90">{value}</div>
    </div>
  );
}

export function Timeline({
  items,
  rtl = false,
}: {
  items: Array<{
    title: string;
    hint: string;
    value: ReactNode;
    tone?: "blue" | "green" | "slate";
  }>;
  rtl?: boolean;
}) {
  const nodeTone = {
    blue: "bg-sky-400 shadow-[0_0_0_6px_rgba(59,130,246,0.12)]",
    green: "bg-emerald-400 shadow-[0_0_0_6px_rgba(34,197,94,0.12)]",
    slate: "bg-white/55 shadow-[0_0_0_6px_rgba(255,255,255,0.06)]",
  };

  return (
    <div className="relative">
      <div className={cn("absolute top-3 bottom-3 w-px bg-white/10", rtl ? "right-3" : "left-3")} />
      <div className="space-y-5">
        {items.map((item) => (
          <div key={item.title} className={cn("relative grid gap-3", rtl ? "pr-9 text-right" : "pl-9")}>
            <span
              className={cn(
                "absolute top-1.5 size-3 rounded-full",
                rtl ? "right-[7px]" : "left-[7px]",
                nodeTone[item.tone || "slate"]
              )}
            />
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">{item.title}</div>
            <div className="text-base font-semibold text-white/92">{item.value}</div>
            <div className="text-sm text-white/58">{item.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
