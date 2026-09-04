export type NavTab = { href: string; label: string; icon: "library" | "plans" | "calendar" | "account" };

export const NAV_TABS: NavTab[] = [
  { href: "/library", label: "Library", icon: "library" },
  { href: "/plans", label: "Plans", icon: "plans" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/account", label: "Account", icon: "account" },
];
