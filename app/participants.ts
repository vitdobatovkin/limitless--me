export type Person = {
  handle: string;
  image?: string;
  bio?: string;
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
    kind: "person",
    special: "elon",
  },
  {
    name: "Grok Bot",
    handle: "@bot",
    image: xAvatar("@bot"),
    bio: "AI teammates that you can give real work to.",
    kind: "entity",
  },
  {
    name: "Benji Taylor",
    handle: "@benjitaylor",
    image: xAvatar("@benjitaylor"),
    bio: "leading design @x / @xai. prev. head of design @base. founder @family (acq by @aave).",
    kind: "person",
  },
  {
    name: "Josh Kim",
    handle: "@joshpkim",
    image: xAvatar("@joshpkim"),
    bio: "growing @bot @spacexai, prev @cursor_ai @notionhq",
    kind: "person",
  },
  {
    name: "Lauren",
    handle: "@poteto",
    image: xAvatar("@poteto"),
    bio: "Grok @Bot and Cursor at @SpaceXAI. Shipping with React compiler core team, prev @cursor_ai @meta @netflix",
    kind: "person",
  },
  {
    name: "SpaceXAI",
    handle: "@SpaceXAI",
    image: xAvatar("@SpaceXAI"),
    bio: "",
    kind: "entity",
  },
  {
    name: "Michael Truell",
    handle: "@mntruell",
    image: xAvatar("@mntruell"),
    bio: "Building @SpaceXAI",
    kind: "person",
  },
  {
    name: "Aman Sanger",
    handle: "@amanrsanger",
    image: xAvatar("@amanrsanger"),
    bio: "@cursor_ai founder",
    kind: "person",
  },
  {
    name: "Andrew Milich",
    handle: "@milichab",
    image: xAvatar("@milichab"),
    bio: "@spacexai previously @cursor_ai, former CEO @skiffprivacy (acquired by @notionhq)",
    kind: "person",
  },
  {
    name: "Jason Ginsberg",
    handle: "@JasonBud",
    image: xAvatar("@JasonBud"),
    bio: "@spacexai. fmr @cursor_ai, founder/CTO @skiffprivacy acq. by @notion",
    kind: "person",
  },
  {
    name: "Sualeh Asif",
    handle: "@sualehasif996",
    image: xAvatar("@sualehasif996"),
    bio: "@cursor_ai founder | anysphere.inc",
    kind: "person",
  },
  {
    name: "0xMarioNawfal",
    handle: "@RoundtableSpace",
    image: xAvatar("@RoundtableSpace"),
    bio: "@MarioNawfal’s Crypto & AI Account",
    kind: "supporter",
  },
];
