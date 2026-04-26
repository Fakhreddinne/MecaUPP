import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
};

function iconProps(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cn("size-5", className),
  };
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 3 5.5 6v5.8c0 4.1 2.6 7.8 6.5 9.2 3.9-1.4 6.5-5.1 6.5-9.2V6L12 3Z" />
      <path d="m9.4 12 1.8 1.8 3.8-4.1" />
    </svg>
  );
}

export function PulseIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 12h4l2.3-4.5L14 16l2.2-4H21" />
      <path d="M4 6h16" opacity="0.35" />
      <path d="M4 18h16" opacity="0.35" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M8 10V8a4 4 0 1 1 8 0v2" />
      <circle cx="12" cy="15" r="1.2" />
    </svg>
  );
}

export function OilIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M6 14h9.5a3.5 3.5 0 1 1 0 7H10" />
      <path d="M8 8h4l4 6" />
      <path d="m4 10 5-5" />
    </svg>
  );
}

export function BrakeIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 5v2" />
      <path d="M12 17v2" />
    </svg>
  );
}

export function GlassIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 8c2.5-2.3 13.5-2.3 16 0" />
      <path d="M6 8v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" />
      <path d="m10 12 4-4" />
    </svg>
  );
}

export function ScanIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M7 4H5a1 1 0 0 0-1 1v2" />
      <path d="M17 4h2a1 1 0 0 1 1 1v2" />
      <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
      <path d="M17 20h2a1 1 0 0 0 1-1v-2" />
      <path d="M8 12h8" />
      <path d="M10 9h4" />
      <path d="M10 15h4" />
    </svg>
  );
}

export function WrenchIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m14 5 5 5" />
      <path d="M7 17 4 20" />
      <path d="m4 13 7-7a4 4 0 0 1 5.6 5.6l-7 7A4 4 0 1 1 4 13Z" />
    </svg>
  );
}

export function SnowIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 3v18" />
      <path d="m8 5 4 2 4-2" />
      <path d="m8 19 4-2 4 2" />
      <path d="M4.5 8.5 19.5 15.5" />
      <path d="m5 16 3.5-2.5L8 9.5" />
      <path d="M19.5 8.5 4.5 15.5" />
      <path d="m19 16-3.5-2.5L16 9.5" />
    </svg>
  );
}

export function SparklesIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
      <path d="m19 15 .8 1.9L22 18l-2.2 1.1L19 21l-.8-1.9L16 18l2.2-1.1L19 15Z" />
      <path d="m5 14 .9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14Z" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function QrIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M15 14h2v2h-2z" />
      <path d="M19 14h1v1h-1z" />
      <path d="M14 18h2" />
      <path d="M17 18h3v2h-3z" />
    </svg>
  );
}

export function CarIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M5 15h14l-1.2-4a3 3 0 0 0-2.9-2.1H9.1A3 3 0 0 0 6.2 11L5 15Z" />
      <path d="M4 15v3a1 1 0 0 0 1 1h1" />
      <path d="M20 15v3a1 1 0 0 1-1 1h-1" />
      <circle cx="8" cy="17" r="1.5" />
      <circle cx="16" cy="17" r="1.5" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 10h16" />
    </svg>
  );
}

export function GaugeIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M5 15a7 7 0 1 1 14 0" />
      <path d="m12 12 4-3" />
      <path d="M12 12v3" />
    </svg>
  );
}
