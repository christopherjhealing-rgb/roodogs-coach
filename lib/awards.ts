// Post-match awards the coach picks at full-time. Shared by the match screen
// (picking) and the season stats (badges) so ids and labels never drift.

export interface AwardDef {
  id: string;
  label: string;
  emoji: string;
}

export const MATCH_AWARDS: AwardDef[] = [
  { id: "try", label: "Try of the day", emoji: "🏉" },
  { id: "attacker", label: "Attacker of the day", emoji: "⚡" },
  { id: "tackle", label: "Tackle of the day", emoji: "💪" },
  { id: "player", label: "Player of the day", emoji: "🏅" },
  { id: "week", label: "Player of the week", emoji: "⭐" },
];

export const AWARD_BY_ID: Record<string, AwardDef> = Object.fromEntries(
  MATCH_AWARDS.map((a) => [a.id, a])
);
