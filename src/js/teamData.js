// Team data and cutout image references

export const cutout_steven_cres = "/images/man_3_buque-removebg-preview.png";
export const cutout_greg        = "/images/man_2_calo-removebg-preview.png";
export const cutout_jhon_leovil = "/images/man_4_avelino-removebg-preview.png";
export const cutout_roy         = "/images/man_5_bayotlang-removebg-preview.png";
export const cutout_christian   = "/images/man_1_abamo-removebg-preview.png";

export const backMembers = [
  {
    name: "Joko",
    role: "ROTC liaison",
    stat: "Sharpest salute in the squad",
    fact: "Keeps the whole team in formation, literally and figuratively.",
    tags: ["Discipline", "Logistics", "Drills"],
    cutout: cutout_christian
  },
  {
    name: "Robert Lee",
    role: "Full-stack dev",
    stat: "6 features this quarter",
    fact: "Keeps a running doc titled 'things I will fix later' that never gets shorter.",
    tags: ["React", "Node", "Docker"],
    cutout: cutout_steven_cres
  }
];

export const frontMembers = [
  {
    name: "Steven Cres",
    role: "Team lead",
    stat: "24 sprints led",
    fact: "Runs standup in under 6 minutes flat, and has the timer app to prove it.",
    tags: ["Planning", "Roadmaps", "1:1s"],
    cutout: cutout_steven_cres
  },
  {
    name: "Greg",
    role: "Backend dev",
    stat: "99.98% uptime",
    fact: "Once debugged a race condition entirely by staring at logs on a whiteboard.",
    tags: ["Go", "Postgres", "Kafka"],
    cutout: cutout_greg
  },
  {
    name: "Jhon Leovil",
    role: "Frontend dev",
    stat: "2,400 lines shipped",
    fact: "Cannot resist refactoring a component the moment he touches it.",
    tags: ["React", "CSS", "A11y"],
    cutout: cutout_jhon_leovil
  },
  {
    name: "Roy",
    role: "QA engineer",
    stat: "58 bugs squashed",
    fact: "Found three edge cases before breakfast and wrote integration tests for all of them.",
    tags: ["Cypress", "Jest", "TDD"],
    cutout: cutout_roy
  },
  {
    name: "Christian",
    role: "DevOps engineer",
    stat: "140 deploys without rollback",
    fact: "Refuses to approve any PR that doesn't have at least one green checkmark from CI.",
    tags: ["Kubernetes", "Terraform", "CI/CD"],
    cutout: cutout_christian
  }
];
