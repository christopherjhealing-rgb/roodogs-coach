export type IconName = "team" | "drills" | "sessions" | "board" | "match";

export const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/team", label: "Team", icon: "team" },
  { href: "/drills", label: "Drills", icon: "drills" },
  { href: "/sessions", label: "Sessions", icon: "sessions" },
  { href: "/board", label: "Board", icon: "board" },
  { href: "/match", label: "Match", icon: "match" },
];
