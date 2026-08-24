import type { Board, BoardMovement, BoardToken } from "./types";

// Pre-drawn setup diagrams, one per seeded drill. Pitch coordinates are
// 0–100 across by 0–140 down (see BoardCanvas). Ids are stable so the seed
// can be merged in idempotently and linked from seedDrills.ts via boardId.

type Tk = Omit<BoardToken, "id">;
type Mv = Omit<BoardMovement, "id">;

const P = (x: number, y: number, label?: string): Tk => ({
  type: "player",
  x,
  y,
  label,
});
const O = (x: number, y: number): Tk => ({ type: "opponent", x, y });
const C = (x: number, y: number, color?: string): Tk => ({
  type: "cone",
  x,
  y,
  color,
});
const H = (x: number, y: number): Tk => ({ type: "hurdle", x, y });
const BAG = (x: number, y: number): Tk => ({ type: "bag", x, y });
const BALL = (x: number, y: number): Tk => ({ type: "ball", x, y });

const run = (pts: { x: number; y: number }[]): Mv => ({ type: "run", points: pts });
const pass = (pts: { x: number; y: number }[]): Mv => ({ type: "pass", points: pts });
const tackle = (pts: { x: number; y: number }[]): Mv => ({
  type: "tackle",
  points: pts,
});

const YELLOW = "#facc15";
const RED = "#ef4444";
const BLUE = "#3b82f6";

/** Four cones marking a square centred on (cx,cy), half-width s. */
function square(cx: number, cy: number, s: number, color?: string): Tk[] {
  return [
    C(cx - s, cy - s, color),
    C(cx + s, cy - s, color),
    C(cx + s, cy + s, color),
    C(cx - s, cy + s, color),
  ];
}

/** Two vertical lines of cones forming a channel. */
function channel(
  xl: number,
  xr: number,
  yTop: number,
  yBot: number,
  n = 3,
  color?: string
): Tk[] {
  const out: Tk[] = [];
  for (let i = 0; i < n; i++) {
    const y = yTop + ((yBot - yTop) * i) / (n - 1);
    out.push(C(xl, y, color), C(xr, y, color));
  }
  return out;
}

function mk(
  id: string,
  name: string,
  tokens: Tk[],
  movements: Mv[]
): Board {
  return {
    id,
    name,
    kind: "drill",
    tokens: tokens.map((t, i) => ({ ...t, id: `${id}-t${i}` })),
    movements: movements.map((m, i) => ({ ...m, id: `${id}-m${i}` })),
    updatedMs: 0,
  };
}

export const SEED_BOARDS: Board[] = [
  mk(
    "seed-board-stuck-in-the-mud",
    "Stuck in the Mud — setup",
    [
      ...square(50, 70, 26),
      P(38, 58, "1"),
      P(62, 62, "2"),
      P(45, 82, "3"),
      P(58, 80, "4"),
      O(50, 70),
    ],
    [run([{ x: 38, y: 58 }, { x: 44, y: 74 }])]
  ),
  mk(
    "seed-board-rob-the-nest",
    "Rob the Nest — setup",
    [
      BALL(50, 70),
      BALL(46, 66),
      BALL(54, 74),
      ...square(50, 70, 6, YELLOW),
      C(26, 42),
      C(74, 42),
      C(26, 98),
      C(74, 98),
      P(26, 42, "1"),
      P(74, 42, "2"),
      P(26, 98, "3"),
      P(74, 98, "4"),
    ],
    [
      run([{ x: 30, y: 46 }, { x: 46, y: 66 }]),
      run([{ x: 70, y: 94 }, { x: 54, y: 74 }]),
    ]
  ),
  mk(
    "seed-board-follow-the-leader",
    "Follow the Leader — setup",
    [...square(50, 70, 28), P(44, 74, "1"), P(48, 78, "2")],
    [
      run([
        { x: 44, y: 74 },
        { x: 40, y: 56 },
        { x: 56, y: 50 },
        { x: 62, y: 66 },
      ]),
    ]
  ),
  mk(
    "seed-board-octopus-tag",
    "Octopus Tag — setup",
    [
      ...channel(30, 70, 40, 100, 3),
      P(36, 96, "1"),
      P(50, 98, "2"),
      P(64, 94, "3"),
      O(50, 70),
    ],
    [run([{ x: 50, y: 98 }, { x: 50, y: 44 }])]
  ),
  mk(
    "seed-board-passing-lines",
    "Passing Lines — setup",
    [
      ...channel(24, 76, 44, 96, 2),
      P(34, 90, "1"),
      P(44, 90, "2"),
      P(54, 90, "3"),
      P(64, 90, "4"),
      BALL(34, 90),
    ],
    [
      pass([{ x: 36, y: 88 }, { x: 44, y: 88 }]),
      pass([{ x: 46, y: 88 }, { x: 54, y: 88 }]),
      pass([{ x: 56, y: 88 }, { x: 64, y: 88 }]),
      run([{ x: 50, y: 96 }, { x: 50, y: 50 }]),
    ]
  ),
  mk(
    "seed-board-pass-and-follow",
    "Pass and Follow — setup",
    [
      ...square(50, 70, 24),
      P(26, 46, "1"),
      P(74, 46, "2"),
      P(74, 94, "3"),
      P(26, 94, "4"),
      BALL(26, 46),
    ],
    [
      pass([{ x: 30, y: 46 }, { x: 70, y: 46 }]),
      run([{ x: 30, y: 48 }, { x: 68, y: 46 }]),
    ]
  ),
  mk(
    "seed-board-piggy-in-the-middle",
    "Piggy in the Middle — setup",
    [
      ...square(50, 70, 20),
      P(30, 50, "1"),
      P(70, 50, "2"),
      P(70, 90, "3"),
      P(30, 90, "4"),
      O(50, 70),
      BALL(30, 50),
    ],
    [
      pass([{ x: 33, y: 51 }, { x: 67, y: 51 }]),
      pass([{ x: 70, y: 53 }, { x: 32, y: 88 }]),
    ]
  ),
  mk(
    "seed-board-2v1-draw-and-pass",
    "2 v 1 Draw and Pass — setup",
    [
      ...channel(36, 64, 44, 98, 2),
      P(45, 92, "1"),
      P(58, 92, "2"),
      O(50, 60),
      BALL(45, 92),
    ],
    [
      run([{ x: 45, y: 90 }, { x: 47, y: 68 }]),
      pass([{ x: 47, y: 66 }, { x: 58, y: 74 }]),
      run([{ x: 58, y: 90 }, { x: 58, y: 50 }]),
    ]
  ),
  mk(
    "seed-board-pass-relay",
    "Pass Relay — setup",
    [
      C(40, 44),
      C(60, 44),
      P(40, 96, "1"),
      P(40, 104, "2"),
      P(60, 96, "3"),
      P(60, 104, "4"),
      BALL(40, 96),
    ],
    [
      run([{ x: 40, y: 94 }, { x: 40, y: 48 }, { x: 41, y: 92 }]),
      run([{ x: 60, y: 94 }, { x: 60, y: 48 }, { x: 61, y: 92 }]),
    ]
  ),
  mk(
    "seed-board-tackle-bag-technique",
    "Tackle Bag Basics — setup",
    [
      BAG(38, 60),
      BAG(52, 60),
      BAG(66, 60),
      P(38, 92, "1"),
      P(52, 92, "2"),
      P(66, 92, "3"),
    ],
    [
      tackle([{ x: 38, y: 88 }, { x: 38, y: 66 }]),
      tackle([{ x: 52, y: 88 }, { x: 52, y: 66 }]),
      tackle([{ x: 66, y: 88 }, { x: 66, y: 66 }]),
    ]
  ),
  mk(
    "seed-board-knee-tag",
    "Knee Tag — setup",
    [
      ...square(40, 70, 12, YELLOW),
      ...square(64, 70, 12, YELLOW),
      P(40, 70, "1"),
      O(40, 70),
      P(64, 70, "2"),
      O(64, 70),
    ],
    []
  ),
  mk(
    "seed-board-kneeling-tackles",
    "Kneeling Tackles — setup",
    [P(44, 70), O(56, 70), BALL(56, 70)],
    [
      run([{ x: 56, y: 84 }, { x: 56, y: 58 }]),
      tackle([{ x: 46, y: 70 }, { x: 54, y: 70 }]),
    ]
  ),
  mk(
    "seed-board-bulldog",
    "Roodog Bulldog — setup",
    [
      ...channel(22, 78, 42, 100, 3),
      P(34, 96, "1"),
      P(50, 96, "2"),
      P(66, 96, "3"),
      O(42, 70),
      O(58, 70),
    ],
    [run([{ x: 50, y: 96 }, { x: 50, y: 46 }])]
  ),
  mk(
    "seed-board-evasion-channel",
    "1 v 1 Evasion Channel — setup",
    [
      ...channel(40, 60, 46, 96, 2),
      P(50, 92, "1"),
      O(50, 60),
      BALL(50, 92),
    ],
    [
      run([
        { x: 50, y: 90 },
        { x: 44, y: 74 },
        { x: 56, y: 60 },
      ]),
    ]
  ),
  mk(
    "seed-board-footwork-ladders",
    "Fast Feet and Side-step — setup",
    [
      H(50, 92),
      H(50, 84),
      H(50, 76),
      H(50, 68),
      C(50, 58, RED),
      P(50, 100, "1"),
    ],
    [
      run([
        { x: 50, y: 98 },
        { x: 50, y: 62 },
        { x: 62, y: 52 },
      ]),
    ]
  ),
  mk(
    "seed-board-traffic-lights",
    "Traffic Lights — setup",
    [
      ...square(50, 70, 28),
      P(38, 58, "1"),
      P(60, 56, "2"),
      P(44, 82, "3"),
      P(62, 80, "4"),
      BALL(38, 58),
      BALL(60, 56),
    ],
    []
  ),
  mk(
    "seed-board-corner-ball",
    "Corner Ball — setup",
    [
      ...square(50, 70, 26, YELLOW),
      P(34, 82, "1"),
      P(46, 86, "2"),
      O(58, 78),
      O(64, 64),
      BALL(34, 82),
    ],
    [
      pass([{ x: 36, y: 82 }, { x: 46, y: 84 }]),
      run([{ x: 47, y: 84 }, { x: 72, y: 50 }]),
    ]
  ),
  mk(
    "seed-board-ruck-body-position",
    "Over-the-Ball Body Shape — setup",
    [BALL(50, 74), P(50, 82), P(50, 66), BAG(50, 56)],
    [run([{ x: 50, y: 80 }, { x: 50, y: 70 }])]
  ),
  mk(
    "seed-board-2v1-ruck-race",
    "2 v 1 Ruck Race — setup",
    [
      ...channel(34, 66, 48, 96, 2),
      BALL(50, 72),
      BAG(50, 66),
      P(40, 92, "1"),
      P(60, 92, "2"),
      O(50, 46),
    ],
    [
      run([{ x: 40, y: 90 }, { x: 48, y: 74 }]),
      run([{ x: 60, y: 90 }, { x: 52, y: 74 }]),
    ]
  ),
  mk(
    "seed-board-present-and-sweep",
    "Tackle, Present, Sweep — setup",
    [
      BAG(50, 58),
      BALL(50, 70),
      P(50, 80, "1"),
      P(42, 74, "2"),
      P(34, 82, "3"),
    ],
    [
      tackle([{ x: 50, y: 78 }, { x: 50, y: 64 }]),
      pass([{ x: 44, y: 74 }, { x: 34, y: 82 }]),
    ]
  ),
  mk(
    "seed-board-shuttle-relays",
    "Try-Line Shuttles — setup",
    [
      C(36, 50),
      C(50, 50),
      C(64, 50),
      C(30, 100, YELLOW),
      C(70, 100, YELLOW),
      P(36, 100, "1"),
      P(50, 100, "2"),
      P(64, 100, "3"),
    ],
    [
      run([{ x: 36, y: 98 }, { x: 36, y: 54 }, { x: 37, y: 96 }]),
      run([{ x: 50, y: 98 }, { x: 50, y: 54 }, { x: 51, y: 96 }]),
    ]
  ),
  mk(
    "seed-board-rugby-netball",
    "Rugby Netball — setup",
    [
      ...square(50, 70, 28, YELLOW),
      P(38, 84, "1"),
      P(54, 88, "2"),
      P(46, 66, "3"),
      O(60, 74),
      O(42, 54),
      BALL(38, 84),
    ],
    [
      pass([{ x: 40, y: 84 }, { x: 54, y: 88 }]),
      pass([{ x: 54, y: 86 }, { x: 46, y: 66 }]),
      pass([{ x: 46, y: 64 }, { x: 50, y: 44 }]),
    ]
  ),
  mk(
    "seed-board-crocodile-crossing",
    "Crocodile Crossing — setup",
    [
      ...channel(28, 72, 44, 98, 3, BLUE),
      P(34, 94, "1"),
      P(50, 96, "2"),
      P(66, 94, "3"),
      O(44, 70),
      O(58, 70),
      BALL(34, 94),
      BALL(50, 96),
    ],
    [run([{ x: 50, y: 94 }, { x: 50, y: 46 }])]
  ),
  mk(
    "seed-board-golden-try",
    "Golden Try Game — setup",
    [
      C(28, 44, YELLOW),
      C(72, 44, YELLOW),
      C(28, 96, YELLOW),
      C(72, 96, YELLOW),
      P(40, 84, "1"),
      P(52, 88, "2"),
      O(46, 60),
      O(60, 66),
      BALL(40, 84),
    ],
    [
      pass([{ x: 42, y: 84 }, { x: 52, y: 88 }]),
      run([{ x: 52, y: 86 }, { x: 56, y: 48 }]),
    ]
  ),
  mk(
    "seed-board-catch-above-head",
    "High Five Catches — setup",
    [P(40, 84, "1"), P(40, 58, "2"), P(62, 84, "3"), P(62, 58, "4"), BALL(40, 84)],
    [
      pass([
        { x: 40, y: 82 },
        { x: 40, y: 70 },
        { x: 40, y: 60 },
      ]),
      pass([
        { x: 62, y: 60 },
        { x: 62, y: 72 },
        { x: 62, y: 82 },
      ]),
    ]
  ),
];
