export interface Flavor {
  id: string;
  index: number;
  name: string;
  tagline: string;
  description: string;
  price: number;
  /** Label / can colors */
  can: { base: string; deep: string; accent: string; text: string };
  /** Background gradient stops: sky (top) -> horizon (bottom) */
  bg: { sky: string; horizon: string };
  fruit: string;
  /** AI-generated assets */
  label: string;
  bgImage: string;
}

export const FLAVORS: Flavor[] = [
  {
    id: "azure-berry",
    label: "/labels/azure-berry.jpg",
    bgImage: "/backgrounds/azure-berry.jpg",
    index: 0,
    name: "Azure Berry",
    tagline: "Midday Sky",
    description:
      "Crisp blue raspberry harvested at 10,000 feet. Sweet, tangy, and bright as the midday sky itself.",
    price: 15000,
    can: { base: "#38bdf8", deep: "#0c4a6e", accent: "#e0f2fe", text: "#f0f9ff" },
    bg: { sky: "#38bdf8", horizon: "#e0f2fe" },
    fruit: "Blue Raspberry",
  },
  {
    id: "solar-citrus",
    label: "/labels/solar-citrus.jpg",
    bgImage: "/backgrounds/solar-citrus.jpg",
    index: 1,
    name: "Solar Citrus",
    tagline: "Sunrise",
    description:
      "A burst of fresh orange, bold as the morning sun. Vitamin C and pure momentum in every sip.",
    price: 15000,
    can: { base: "#fb923c", deep: "#7c2d12", accent: "#fef3c7", text: "#fff7ed" },
    bg: { sky: "#fdba74", horizon: "#fff7ed" },
    fruit: "Orange",
  },
  {
    id: "cloud-coconut",
    label: "/labels/cloud-coconut.jpg",
    bgImage: "/backgrounds/cloud-coconut.jpg",
    index: 2,
    name: "Cloud Coconut",
    tagline: "Clouds",
    description:
      "Silky coconut water and vanilla, soft as clouds. Light, creamy, calming — a sweet pause in your day.",
    price: 16000,
    can: { base: "#f8fafc", deep: "#64748b", accent: "#bae6fd", text: "#0f172a" },
    bg: { sky: "#bae6fd", horizon: "#f8fafc" },
    fruit: "Coconut",
  },
  {
    id: "dusk-berry",
    label: "/labels/dusk-berry.jpg",
    bgImage: "/backgrounds/dusk-berry.jpg",
    index: 3,
    name: "Dusk Berry",
    tagline: "Dusk",
    description:
      "Wild mixed berries, mysterious as the twilight sky. Sweet with a wild edge — the perfect way to end the day.",
    price: 16000,
    can: { base: "#c084fc", deep: "#4a044e", accent: "#f9a8d4", text: "#fdf4ff" },
    bg: { sky: "#a855f7", horizon: "#fce7f3" },
    fruit: "Mixed Berry",
  },
  {
    id: "forest-matcha",
    label: "/labels/forest-matcha.jpg",
    bgImage: "/backgrounds/forest-matcha.jpg",
    index: 4,
    name: "Forest Matcha",
    tagline: "Forest",
    description:
      "Matcha and green apple from the heart of the forest. Earthy, fresh, with natural caffeine for focus without the jitters.",
    price: 17000,
    can: { base: "#4ade80", deep: "#14532d", accent: "#fef9c3", text: "#f0fdf4" },
    bg: { sky: "#86efac", horizon: "#f0fdf4" },
    fruit: "Green Apple Matcha",
  },
  {
    id: "terra-cacao",
    label: "/labels/terra-cacao.jpg",
    bgImage: "/backgrounds/terra-cacao.jpg",
    index: 5,
    name: "Terra Cacao",
    tagline: "Earth",
    description:
      "Chocolate and coffee from the heart of the earth. Rich, bold, grounding — a perfect landing after the journey from the sky.",
    price: 18000,
    can: { base: "#b45309", deep: "#451a03", accent: "#fde68a", text: "#fffbeb" },
    bg: { sky: "#d6a05c", horizon: "#fef3c7" },
    fruit: "Chocolate Coffee",
  },
];

export const formatIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");
