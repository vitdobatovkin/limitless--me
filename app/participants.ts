export type Person = {
  handle: string;
  image?: string;
  bio?: string;
  role?: string;
  score?: number;
  name?: string;
  kind?: "person" | "entity" | "supporter";
  special?: "elon";
};

const xAvatar = (handle: string) =>
  `/avatars/${handle.replace(/^@/, "").toLowerCase()}.webp`;

export const RAW_PARTICIPANTS: Person[] = [
  {
    name: "Elon Musk",
    handle: "@elonmusk",
    image: xAvatar("@elonmusk"),
    bio: "",
    role: "Founder of SpaceX and SpaceXAI.",
    kind: "person",
    special: "elon",
  },
  {
    name: "Grok Bot",
    handle: "@bot",
    image: xAvatar("@bot"),
    bio: "",
    role: "AI teammates that you can give real work to.",
    kind: "entity",
  },
  {
    name: "Benji Taylor",
    handle: "@benjitaylor",
    image: xAvatar("@benjitaylor"),
    bio: "",
    role: "Leading design across X and SpaceXAI.",
    kind: "person",
  },
  {
    name: "Josh Kim",
    handle: "@joshpkim",
    image: xAvatar("@joshpkim"),
    bio: "",
    role: "Growing Grok Bot at SpaceXAI.",
    kind: "person",
  },
  {
    name: "Lauren",
    handle: "@poteto",
    image: xAvatar("@poteto"),
    bio: "",
    role: "Building Grok Bot and Cursor at SpaceXAI.",
    kind: "person",
  },
  {
    name: "Lee Robinson",
    handle: "@leerob",
    image: xAvatar("@leerob"),
    bio: "",
    role: "Model behavior at SpaceXAI. Helping train useful models.",
    kind: "person",
  },
  {
    name: "SpaceXAI",
    handle: "@SpaceXAI",
    image: xAvatar("@SpaceXAI"),
    bio: "",
    role: "Building frontier AI to advance human understanding.",
    kind: "entity",
  },
  {
    name: "Michael Truell",
    handle: "@mntruell",
    image: xAvatar("@mntruell"),
    bio: "",
    role: "Building SpaceXAI. Co-founder of Cursor.",
    kind: "person",
  },
  {
    name: "Aman Sanger",
    handle: "@amanrsanger",
    image: xAvatar("@amanrsanger"),
    bio: "",
    role: "Co-founder of Cursor.",
    kind: "person",
  },
  {
    name: "Andrew Milich",
    handle: "@milichab",
    image: xAvatar("@milichab"),
    bio: "",
    role: "Building products at SpaceXAI. Previously Cursor and Skiff.",
    kind: "person",
  },
  {
    name: "Jason Ginsberg",
    handle: "@JasonBud",
    image: xAvatar("@JasonBud"),
    bio: "",
    role: "Building at SpaceXAI. Previously Cursor; co-founder and CTO of Skiff.",
    kind: "person",
  },
  {
    name: "Sualeh Asif",
    handle: "@sualehasif996",
    image: xAvatar("@sualehasif996"),
    bio: "",
    role: "Building at SpaceXAI. Co-founder of Cursor.",
    kind: "person",
  },
  {
    name: "Oskar Schulz",
    handle: "@Oskarlso",
    image: xAvatar("@Oskarlso"),
    bio: "",
    role: "Building at SpaceXAI. Previously Cursor.",
    kind: "person",
  },
  {
    name: "James Burnham",
    handle: "@BurnhamDC",
    image: xAvatar("@BurnhamDC"),
    bio: "",
    role: "Legal at SpaceXAI and X.",
    kind: "person",
  },
  {
    name: "0xMarioNawfal",
    handle: "@RoundtableSpace",
    image: xAvatar("@RoundtableSpace"),
    bio: "",
    role: "Active Grok Bot supporter covering AI workflows and use cases.",
    kind: "supporter",
  },
];
