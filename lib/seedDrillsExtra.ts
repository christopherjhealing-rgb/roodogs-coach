import type { Drill } from "./types";

// A few set-piece / law drills the imported library doesn't cover, redrawn in
// the same animated-diagram style so the whole library is consistent. Kept in
// their own file (not the generated kit) so they're easy to hand-edit.
export const SEED_EXTRA_DRILLS: Drill[] = [
  {
    id: "kx-scrum-setup",
    name: "Safe Scrum Set-up",
    tags: ["setpiece"],
    durationMins: 8,
    equipment: "Ball",
    players: "6+",
    area: "Small square",
    level: "mod",
    description:
      "Two front rows of three. Practise the sequence — crouch, bind, set — with straight backs and no early pushing. At U10 keep it uncontested: it's about a safe, square set-up and a straight feed, not winning a shove.",
    cues:
      "Flat backs, heads up, bind before the push. Hooker calls; scrum-half feeds straight.",
    harder: "Add a gentle, even push once the bind is solid.",
    diagramSpec:
      "size 4 3;A .38 .46 1;A .5 .46 2;A .62 .46 3;D .38 .6 1;D .5 .6 2;D .62 .6 3;B .52 .53;Q .74 .5;t .5 .12 Crouch - bind - set. Straight backs, feed straight;t .5 .92 U10: uncontested - safe set-up over shove",
  },
  {
    id: "kx-lineout-throw",
    name: "Lineout: Straight Throw & Jump",
    tags: ["setpiece"],
    durationMins: 8,
    equipment: "Balls",
    players: "6+",
    area: "5m off a line",
    level: "mod",
    description:
      "Two short lines a metre apart. Thrower calls, throws straight down the gap, jumper goes straight up to catch. Rotate the thrower and jumper so everyone has a go.",
    cues:
      "Call first, throw to the top of the jump, lift the jumper straight — never across the line.",
    harder: "Add a second option (front and middle) and a quick tap-down.",
    diagramSpec:
      "size 3 4;l .5 .12 .5 .9;A .4 .34 J;A .4 .56;A .4 .78;D .6 .44;D .6 .68;C .18 .3 T;B .18 .3;p .22 .31 .4 .32;t .5 .07 Call, straight throw to the jumper, lift straight up",
  },
  {
    id: "kx-tap-and-go",
    name: "Tap Penalty: Tap and Go",
    tags: ["setpiece"],
    durationMins: 6,
    equipment: "Balls + cones",
    players: "3+",
    area: "10m channel",
    level: "u9",
    description:
      "Mark the spot with a cone. On the whistle the ball-carrier taps the ball on their own foot, then attacks straight into the space with support either side. Quick and simple — get the game going before the defence is set.",
    cues:
      "Tap on the mark, ball in two hands, go forward first — pass only once you've committed a defender.",
    harder: "Add two passive defenders that come alive the moment you tap.",
    diagramSpec:
      "try bottom;K .3 .74;A .3 .66 T;A .52 .66;A .7 .66;B .31 .69;r .3 .66 .35 .48;p .35 .48 .52 .5;r .52 .5 .52 .32;t .5 .1 Tap on your foot at the mark, then straight into space",
  },
];
