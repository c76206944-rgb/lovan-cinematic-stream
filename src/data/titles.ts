import still01 from "@/assets/still-01.jpg";
import still02 from "@/assets/still-02.jpg";
import still03 from "@/assets/still-03.jpg";
import still04 from "@/assets/still-04.jpg";

export type TitleKind = "movie" | "series" | "documentary" | "short";

export type Title = {
  id: string;
  name: string;
  year: number;
  kind: TitleKind;
  country: string;
  language: string;
  genres: string[];
  runtime: string;
  rating: number;
  maturity: string;
  premium: boolean;
  image: string;
  synopsis: string;
  director: string;
  cast: string[];
  audio: string[];
  subtitles: string[];
};

const images = [still01, still02, still03, still04];

type Seed = Omit<Title, "image" | "id"> & { id: string };

const seeds: Seed[] = [
  {
    id: "night-tariff",
    name: "Night Tariff",
    year: 2024,
    kind: "movie",
    country: "United Kingdom",
    language: "English",
    genres: ["Drama", "Crime"],
    runtime: "1h 48m",
    rating: 4.4,
    maturity: "15",
    premium: false,
    synopsis:
      "A night cab driver keeps a ledger of the passengers he should have refused, until one fare asks him to drive out of the city for good.",
    director: "Aline Mercer",
    cast: ["Tomas Reed", "Nadia Ellis", "Owen Baptiste"],
    audio: ["English", "French"],
    subtitles: ["English", "Spanish", "Arabic"],
  },
  {
    id: "salt-road",
    name: "The Salt Road",
    year: 2023,
    kind: "movie",
    country: "Morocco",
    language: "Arabic",
    genres: ["Adventure", "Drama"],
    runtime: "2h 06m",
    rating: 4.6,
    maturity: "12",
    premium: true,
    synopsis:
      "Three generations of a caravan family cross a shrinking desert route, carrying a debt none of them agreed to.",
    director: "Yasmin Ould",
    cast: ["Hicham Bensaid", "Leila Tazi", "Karim Ferhat"],
    audio: ["Arabic", "French"],
    subtitles: ["English", "French", "Portuguese"],
  },
  {
    id: "blind-window",
    name: "Blind Window",
    year: 2025,
    kind: "series",
    country: "Argentina",
    language: "Spanish",
    genres: ["Thriller", "Mystery"],
    runtime: "6 episodes",
    rating: 4.2,
    maturity: "16",
    premium: false,
    synopsis:
      "A translator working night shifts begins transcribing calls that describe her own apartment building.",
    director: "Paula Iriarte",
    cast: ["Camila Rojas", "Diego Salas", "Marta Vieyra"],
    audio: ["Spanish", "English"],
    subtitles: ["English", "Spanish", "German"],
  },
  {
    id: "harbour-watch",
    name: "Harbour Watch",
    year: 2022,
    kind: "documentary",
    country: "Norway",
    language: "Norwegian",
    genres: ["Documentary"],
    runtime: "1h 22m",
    rating: 4.1,
    maturity: "PG",
    premium: false,
    synopsis:
      "One winter aboard a small trawler crew as quotas shrink and the harbour they grew up in changes hands.",
    director: "Ingrid Holt",
    cast: ["Crew of the Marja"],
    audio: ["Norwegian"],
    subtitles: ["English", "Norwegian", "Japanese"],
  },
  {
    id: "monsoon-letters",
    name: "Monsoon Letters",
    year: 2024,
    kind: "movie",
    country: "India",
    language: "Bengali",
    genres: ["Drama", "Romance"],
    runtime: "1h 57m",
    rating: 4.5,
    maturity: "12",
    premium: true,
    synopsis:
      "Two former students exchange letters across a flooded season, each hiding a decision the other would not forgive.",
    director: "Ritwik Sen",
    cast: ["Ananya Bose", "Sohel Rahman", "Piya Dutta"],
    audio: ["Bengali", "Hindi"],
    subtitles: ["English", "Hindi", "French"],
  },
  {
    id: "cold-signal",
    name: "Cold Signal",
    year: 2025,
    kind: "series",
    country: "Iceland",
    language: "Icelandic",
    genres: ["Thriller", "Science Fiction"],
    runtime: "8 episodes",
    rating: 4.3,
    maturity: "16",
    premium: true,
    synopsis:
      "A decommissioned listening station restarts on its own, and the two engineers sent to shut it down disagree about what it heard.",
    director: "Bjorn Eliasson",
    cast: ["Sigrun Falk", "Ari Jonsson"],
    audio: ["Icelandic", "English"],
    subtitles: ["English", "German", "Spanish"],
  },
  {
    id: "the-last-rehearsal",
    name: "The Last Rehearsal",
    year: 2023,
    kind: "movie",
    country: "Poland",
    language: "Polish",
    genres: ["Drama"],
    runtime: "1h 39m",
    rating: 4.0,
    maturity: "12",
    premium: false,
    synopsis:
      "A closing theatre company stages one final production with an audience of eleven people.",
    director: "Marek Zielinski",
    cast: ["Hanna Kowal", "Piotr Lis"],
    audio: ["Polish"],
    subtitles: ["English", "Polish", "Czech"],
  },
  {
    id: "seventeen-minutes",
    name: "Seventeen Minutes",
    year: 2025,
    kind: "short",
    country: "South Korea",
    language: "Korean",
    genres: ["Drama", "Short"],
    runtime: "17m",
    rating: 4.7,
    maturity: "PG",
    premium: false,
    synopsis:
      "A delivery rider and a hospital receptionist share one lift ride that neither can end.",
    director: "Ji-woo Han",
    cast: ["Min-seo Park", "Tae-yang Koo"],
    audio: ["Korean"],
    subtitles: ["English", "Korean", "Japanese"],
  },
  {
    id: "dust-and-copper",
    name: "Dust and Copper",
    year: 2021,
    kind: "movie",
    country: "Chile",
    language: "Spanish",
    genres: ["Drama", "Western"],
    runtime: "2h 11m",
    rating: 4.4,
    maturity: "16",
    premium: true,
    synopsis:
      "A mining town votes on its own closure while a surveyor tries to finish a map nobody wants completed.",
    director: "Elena Pardo",
    cast: ["Rodrigo Munoz", "Clara Vidal"],
    audio: ["Spanish"],
    subtitles: ["English", "Spanish", "Italian"],
  },
  {
    id: "paper-boats",
    name: "Paper Boats",
    year: 2024,
    kind: "movie",
    country: "Vietnam",
    language: "Vietnamese",
    genres: ["Drama", "Family"],
    runtime: "1h 44m",
    rating: 4.2,
    maturity: "PG",
    premium: false,
    synopsis:
      "A boy sells river tours to tourists so his sister can finish school, until the river is rerouted.",
    director: "Linh Tran",
    cast: ["Quang Nguyen", "Mai Pham"],
    audio: ["Vietnamese"],
    subtitles: ["English", "Vietnamese", "French"],
  },
  {
    id: "the-quiet-exchange",
    name: "The Quiet Exchange",
    year: 2022,
    kind: "series",
    country: "Germany",
    language: "German",
    genres: ["Crime", "Drama"],
    runtime: "10 episodes",
    rating: 4.1,
    maturity: "16",
    premium: false,
    synopsis:
      "Two customs officers at a border crossing build a case against the office that employs them.",
    director: "Katrin Vogel",
    cast: ["Jonas Weber", "Ilse Brandt"],
    audio: ["German", "English"],
    subtitles: ["English", "German", "Turkish"],
  },
  {
    id: "northbound",
    name: "Northbound",
    year: 2026,
    kind: "movie",
    country: "Canada",
    language: "English",
    genres: ["Adventure", "Drama"],
    runtime: "1h 51m",
    rating: 4.3,
    maturity: "12",
    premium: true,
    synopsis:
      "A wildfire spotter drives a stranger north along a road that is closing behind them.",
    director: "Ruth Kavanagh",
    cast: ["Alice Okonkwo", "Samuel Reyes"],
    audio: ["English", "French"],
    subtitles: ["English", "French", "Spanish"],
  },
  {
    id: "the-counting-house",
    name: "The Counting House",
    year: 2023,
    kind: "documentary",
    country: "Kenya",
    language: "Swahili",
    genres: ["Documentary"],
    runtime: "1h 30m",
    rating: 4.5,
    maturity: "PG",
    premium: false,
    synopsis:
      "A women's savings collective in Nairobi keeps a shared ledger through one difficult trading year.",
    director: "Achieng Otieno",
    cast: ["Members of the Mwangaza collective"],
    audio: ["Swahili"],
    subtitles: ["English", "Swahili", "French"],
  },
  {
    id: "low-tide-hotel",
    name: "Low Tide Hotel",
    year: 2025,
    kind: "movie",
    country: "Portugal",
    language: "Portuguese",
    genres: ["Mystery", "Drama"],
    runtime: "1h 58m",
    rating: 4.0,
    maturity: "15",
    premium: false,
    synopsis:
      "Off season, a hotel keeps one guest who has not checked in and will not leave.",
    director: "Joana Matos",
    cast: ["Rui Almeida", "Sofia Nunes"],
    audio: ["Portuguese"],
    subtitles: ["English", "Portuguese", "Spanish"],
  },
  {
    id: "the-second-shift",
    name: "The Second Shift",
    year: 2024,
    kind: "series",
    country: "Japan",
    language: "Japanese",
    genres: ["Drama"],
    runtime: "7 episodes",
    rating: 4.6,
    maturity: "12",
    premium: true,
    synopsis:
      "Night staff at a suburban clinic hold the building together between midnight and six.",
    director: "Kenji Aoyama",
    cast: ["Rina Sato", "Haruto Ishii"],
    audio: ["Japanese"],
    subtitles: ["English", "Japanese", "Korean"],
  },
  {
    id: "field-recordings",
    name: "Field Recordings",
    year: 2022,
    kind: "short",
    country: "Australia",
    language: "English",
    genres: ["Documentary", "Short"],
    runtime: "22m",
    rating: 4.2,
    maturity: "PG",
    premium: false,
    synopsis:
      "A sound archivist returns tapes to the communities that made them.",
    director: "Nell Harding",
    cast: ["Archive contributors"],
    audio: ["English"],
    subtitles: ["English", "Spanish"],
  },
];

export const titles: Title[] = seeds.map((seed, index) => ({
  ...seed,
  image: images[index % images.length],
}));

export const getTitle = (id: string) => titles.find((t) => t.id === id);

const pick = (ids: string[]) =>
  ids.map((id) => titles.find((t) => t.id === id)!).filter(Boolean);

export type Rail = { id: string; heading: string; items: Title[]; progress?: boolean };

export const homeRails: Rail[] = [
  {
    id: "continue",
    heading: "Continue Watching",
    items: pick(["night-tariff", "cold-signal", "monsoon-letters", "the-second-shift"]),
    progress: true,
  },
  { id: "trending", heading: "Trending Worldwide", items: titles.slice(0, 8) },
  { id: "new", heading: "New on LOVAN", items: titles.filter((t) => t.year >= 2025) },
  { id: "region", heading: "Popular in Your Region", items: titles.slice(3, 11) },
  {
    id: "because",
    heading: "Because You Watched The Salt Road",
    items: pick(["dust-and-copper", "northbound", "paper-boats", "low-tide-hotel", "harbour-watch"]),
  },
  { id: "worldwide", heading: "Worldwide Cinema", items: titles.slice(2, 12) },
  {
    id: "international",
    heading: "International Movies",
    items: titles.filter((t) => t.kind === "movie" && t.language !== "English"),
  },
  {
    id: "top-rated",
    heading: "Top Rated",
    items: [...titles].sort((a, b) => b.rating - a.rating).slice(0, 8),
  },
  {
    id: "acclaimed",
    heading: "Critically Acclaimed",
    items: titles.filter((t) => t.rating >= 4.3),
  },
  { id: "hidden", heading: "Hidden Gems", items: titles.slice(6, 14) },
  { id: "short", heading: "Short Watches", items: titles.filter((t) => t.kind === "short") },
  { id: "coming", heading: "Coming Soon", items: titles.filter((t) => t.year >= 2026) },
  { id: "leaving", heading: "Leaving Soon", items: titles.slice(8, 14) },
  { id: "drama", heading: "Drama", items: titles.filter((t) => t.genres.includes("Drama")) },
  {
    id: "documentary",
    heading: "Documentary",
    items: titles.filter((t) => t.kind === "documentary"),
  },
  { id: "recommended", heading: "Recommended For You", items: titles.slice(1, 9) },
];

export const genres = Array.from(new Set(titles.flatMap((t) => t.genres))).sort();
export const countries = Array.from(new Set(titles.map((t) => t.country))).sort();
export const languages = Array.from(new Set(titles.map((t) => t.language))).sort();

export const plans = [
  {
    name: "Free",
    price: "0",
    currency: "USD",
    cadence: "always",
    features: [
      "Full catalogue where rights allow",
      "Up to five ad placements per session",
      "Standard quality on one device",
      "My List and Continue Watching",
    ],
  },
  {
    name: "Premium",
    price: "9.90",
    currency: "USD",
    cadence: "per month",
    features: [
      "No advertising",
      "Highest available quality",
      "Early releases where licensed",
      "Up to four devices",
      "Offline viewing where rights and plan allow",
    ],
  },
  {
    name: "Premium Annual",
    price: "99.00",
    currency: "USD",
    cadence: "per year",
    features: [
      "Everything in Premium",
      "Two months included",
      "Price fixed for twelve months",
    ],
  },
];
