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
  {
    id: "kx-driving-maul-2v2",
    name: "Driving Maul 2 v 2",
    tags: ["rucking", "tackling"],
    durationMins: 8,
    equipment: "Balls + cones",
    players: "4 (2 v 2)",
    area: "3m x 20m channel",
    level: "u9",
    description:
      "Two attackers against two defenders in a narrow channel. 1 carries in hard; 3 and 4 close in to tackle. Just before contact, 1 turns and presents the ball to 2, who either takes the pop or binds on to form a driving maul. 1 and 2 must reach the line; 3 and 4 must finish the tackle or steal the ball.",
    cues:
      "Turn side-on before contact and protect the ball with both hands. 2 calls it early — pop, or bind and drive with low hips.",
    harder: "Defenders start closer and can contest the maul straight away.",
    diagramSpec:
      "size 2 5;try top;K .3 .07;K .7 .07;K .3 .95;K .7 .95;l .3 .07 .3 .95;l .7 .07 .7 .95;D .42 .36 3;D .58 .36 4;A .45 .8 1;A .58 .9 2;B .45 .81;r .45 .8 .47 .46;r .58 .9 .56 .56;p .47 .46 .56 .56;w .4 .38 .56 .44;r .56 .56 .5 .12;t .5 .99 turn and present - pop or drive the maul to the line",
  },
  {
    id: "kx-tackle-jackal-1v1",
    name: "Tackle and Jackal 1 v 1",
    tags: ["tackling", "rucking"],
    durationMins: 6,
    equipment: "Balls + cones",
    players: "2 (1 v 1)",
    area: "3m x 20m channel",
    level: "u9",
    description:
      "One-on-one in the channel. 1 runs in and is tackled by 3 at the halfway point. The moment the tackle is finished, the tackler bounces straight back to their feet and jackals over the ball for a quick steal.",
    cues:
      "Finish the tackle, release, back to feet fast — strong low body over the ball and hands on it before support arrives.",
    harder:
      "Add a support attacker arriving to clear out, so the jackal has to be even quicker.",
    diagramSpec:
      "size 2 5;try top;K .3 .07;K .7 .07;K .3 .95;K .7 .95;l .3 .07 .3 .95;l .7 .07 .7 .95;D .5 .42 3;A .5 .84 1;B .5 .855;r .5 .84 .5 .5;w .41 .45 .59 .5;t .5 .99 tackle at halfway - tackler back to feet and jackals the steal",
  },
  {
    id: "kx-drop-and-pop-3s",
    name: "Drop and Pop in Threes",
    tags: ["passing", "rucking"],
    durationMins: 8,
    equipment: "Balls + cones",
    players: "3",
    area: "2m x 15m channel",
    level: "u9",
    description:
      "Teams of three in a narrow channel with a drop point every 5 metres. 1 runs to the first mark, goes to ground and pops the ball up; 2 catches, runs to the next mark, drops and pops; 3 catches and does the same for 1. Keep the cycle rolling the full length, then turn around and come back.",
    cues:
      "Control the fall, long ball presentation, pop into the catcher's hands — the catcher stays flat and runs onto the ball.",
    harder:
      "Pop to either side on the coach's call; time each length and race the other teams.",
    diagramSpec:
      "size 2 5;try top;K .35 .07;K .65 .07;K .35 .95;K .65 .95;l .35 .07 .35 .95;l .65 .07 .65 .95;K .35 .64;K .65 .64;K .35 .38;K .65 .38;A .5 .86 1;A .38 .94 2;A .62 .94 3;B .5 .875;r .5 .86 .5 .66;r .38 .94 .44 .62;p .5 .66 .44 .62;r .44 .62 .5 .4;r .62 .94 .44 .34;p .5 .4 .44 .34;r .44 .34 .5 .12;t .5 .99 drop and pop every 5m - next runner catches and carries on",
  },
];
