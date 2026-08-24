import type { IconName } from "./navTabs";

// Consistent line icons (24px grid, currentColor stroke) so the nav reads
// as one designed set rather than a row of emoji.
export function NavIcon({
  name,
  className = "h-6 w-6",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (name) {
    case "team":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.2a3 3 0 0 1 0 5.6" />
          <path d="M17.5 13.6a5.5 5.5 0 0 1 3 4.9" />
        </svg>
      );
    case "drills":
      // rugby ball
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="9" ry="5.4" transform="rotate(-45 12 12)" />
          <line x1="8.8" y1="15.2" x2="15.2" y2="8.8" />
          <line x1="10.4" y1="12.4" x2="11.6" y2="13.6" />
          <line x1="12.4" y1="10.4" x2="13.6" y2="11.6" />
        </svg>
      );
    case "sessions":
      // clipboard plan
      return (
        <svg {...common}>
          <rect x="5" y="4.5" width="14" height="16" rx="2" />
          <path d="M9 4.5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
          <line x1="8.5" y1="10" x2="15.5" y2="10" />
          <line x1="8.5" y1="13.5" x2="15.5" y2="13.5" />
          <line x1="8.5" y1="17" x2="12.5" y2="17" />
        </svg>
      );
    case "board":
      // tactics board with a play line
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="15" rx="2" />
          <circle cx="8" cy="15" r="1.1" fill="currentColor" stroke="none" />
          <path d="M8 15c3-6 6-6 8.5-1.5" />
          <path d="M14.5 14.2l2 -0.7 -0.4 2.1" />
        </svg>
      );
    case "match":
      // stopwatch
      return (
        <svg {...common}>
          <circle cx="12" cy="13.5" r="7.5" />
          <path d="M12 13.5V9.2" />
          <line x1="9.5" y1="2.5" x2="14.5" y2="2.5" />
          <line x1="12" y1="2.5" x2="12" y2="5" />
          <line x1="18.5" y1="7" x2="20" y2="5.5" />
        </svg>
      );
  }
}

// Standalone rugby-ball logo mark for the sidebar wordmark.
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
    >
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="6"
        transform="rotate(-45 12 12)"
        fill="#166534"
        stroke="#12332A"
        strokeWidth="1.2"
      />
      <line
        x1="7.8"
        y1="16.2"
        x2="16.2"
        y2="7.8"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <g stroke="#fff" strokeWidth="1.2" strokeLinecap="round">
        <line x1="10" y1="12.4" x2="11.6" y2="14" />
        <line x1="12.4" y1="10" x2="14" y2="11.6" />
      </g>
    </svg>
  );
}
