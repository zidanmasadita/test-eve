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
    tagline: "Langit Siang",
    description:
      "Segarnya blue raspberry dari ketinggian 10.000 kaki. Manis-asam yang bikin harimu cerah secerah langit siang.",
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
    tagline: "Matahari Terbit",
    description:
      "Ledakan jeruk segar seterik matahari pagi. Vitamin C dan semangat dalam satu tegukan hangat.",
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
    tagline: "Awan",
    description:
      "Lembutnya air kelapa dan vanilla selembut awan. Ringan, creamy, menenangkan — jeda manis di tengah harimu.",
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
    tagline: "Senja",
    description:
      "Campuran berry liar semisterius langit senja. Manis, sedikit wild — teman terbaik untuk menutup hari.",
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
    tagline: "Hutan",
    description:
      "Matcha dan apel hijau dari jantung hutan. Earthy, fresh, dengan kafein alami yang bikin fokus tanpa deg-degan.",
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
    tagline: "Bumi",
    description:
      "Cokelat dan kopi dari perut bumi. Rich, bold, dan grounding — pendaratan sempurna setelah perjalanan dari langit.",
    price: 18000,
    can: { base: "#b45309", deep: "#451a03", accent: "#fde68a", text: "#fffbeb" },
    bg: { sky: "#d6a05c", horizon: "#fef3c7" },
    fruit: "Chocolate Coffee",
  },
];

export const formatIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");
