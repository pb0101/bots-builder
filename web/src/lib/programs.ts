export interface Program {
  id: string;            // must match a key in the Stripe price-map SSM param
  badge: string;
  name: string;
  ages: string;
  weeks: string;
  price: number;         // display only; Stripe is the source of truth
  tagline: string;
  outcomes: string[];
  color: string;         // accent CSS variable
}

export const programs: Program[] = [
  {
    id: "trial",
    badge: "GO",
    name: "Trial Workshop",
    ages: "Ages 7–12",
    weeks: "One session · 90 min",
    price: 25,
    tagline: "Build, code, and drive-test a robot in one Saturday morning. Credit toward any course.",
    outcomes: [
      "Your kid builds and programs a real robot in 90 minutes",
      "You watch the final showcase and meet the instructor",
      "The $25 applies as credit if you enroll within 7 days",
    ],
    color: "var(--sun)",
  },
  {
    id: "junior",
    badge: "JR",
    name: "Junior Builders",
    ages: "Ages 7–8",
    weeks: "8 weeks · 60 min",
    price: 299,
    tagline: "Story-driven first robots: motors, sensors, and an electromagnet crane.",
    outcomes: [
      "Builds and runs eight working machines",
      "Learns sequences, loops, and sensors through stories",
      "Presents a favorite build at the Robot Carnival showcase",
    ],
    color: "var(--mint)",
  },
  {
    id: "explorer",
    badge: "L1",
    name: "Level 1 · Explorer",
    ages: "Ages 9–12",
    weeks: "8 weeks · 75 min",
    price: 379,
    tagline: "Motion and sensors. Ends with a fully autonomous rescue mission.",
    outcomes: [
      "Programs a robot to navigate by touch, distance, and color",
      "Masters calibration, headings, loops, and if/else logic",
      "Demo Day: parents watch a 100-point autonomous rescue run",
    ],
    color: "var(--cobalt)",
  },
  {
    id: "builder",
    badge: "L2",
    name: "Level 2 · Builder",
    ages: "Ages 9–12",
    weeks: "8 weeks · 75 min",
    price: 379,
    tagline: "Gears, arms, claws, and launchers. Robots that move the world.",
    outcomes: [
      "Designs geared mechanisms and motorized attachments",
      "Builds the classic claw robot and a scoring launcher",
      "Grand Challenge: a timed factory-floor manipulation course",
    ],
    color: "var(--sun)",
  },
  {
    id: "coder",
    badge: "L3",
    name: "Level 3 · Coder",
    ages: "Ages 10–13",
    weeks: "8 weeks · 75 min",
    price: 399,
    tagline: "Same robot, real Python. Variables, functions, and a P-controller.",
    outcomes: [
      "Writes robot programs in Python, not just blocks",
      "Builds a proportional line follower — a real control algorithm",
      "Keeps an engineering notebook with logged tuning data",
    ],
    color: "var(--cobalt)",
  },
  {
    id: "competitor",
    badge: "L4",
    name: "Level 4 · Competition Team",
    ages: "Ages 9–14",
    weeks: "Seasonal · 90 min",
    price: 599,
    tagline: "A real VEX IQ competition team. Worlds is held in Dallas.",
    outcomes: [
      "Competes in official tournaments as a registered team",
      "Trains both autonomous coding and driver skills",
      "Learns alliance strategy, notebooks, and judged presentations",
    ],
    color: "var(--ink)",
  },
];
