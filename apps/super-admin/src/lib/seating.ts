/**
 * Seat map model shared by the event create & edit pages.
 * Mirrors backend/src/modules/organiser/seating.js — keep the two in sync.
 */

export type SeatingMode = "GENERAL" | "THEATRE" | "TABLES" | "MIXED";
export type SectionKind = "ROWS" | "TABLES" | "STANDING";
/** What a seat is marked as in the builder. */
export type SeatMark = "normal" | "accessible" | "blocked";

export interface SeatSection {
  id: string;
  name: string;
  tierName: string;
  kind: SectionKind;
  // ROWS
  rowCount?: number;
  startRow?: string;
  seatsPerRow?: number;
  // TABLES
  tables?: number;
  seatsPerTable?: number;
  // STANDING
  capacity?: number;
  // ROWS + TABLES: seat keys like "A-5" / "T2-3"
  blocked?: string[];
  accessible?: string[];
}

export interface SeatingConfigPayload {
  version: 2;
  layout: "THEATRE" | "TABLES" | "MIXED";
  stageLabel: string;
  sections: Array<Record<string, unknown>>;
}

export const MODE_OPTIONS: Array<{ id: SeatingMode; title: string; subtitle: string; example: string; emoji: string }> = [
  {
    id: "GENERAL",
    emoji: "🧍",
    title: "Open space / Standing",
    subtitle: "No seat numbers. Buyers just choose how many tickets they want.",
    example: "Concerts, clubs, festivals, expos",
  },
  {
    id: "THEATRE",
    emoji: "🎭",
    title: "Rows of seats",
    subtitle: "Numbered seats in rows. Buyers pick their exact seat (A1, A2…).",
    example: "Theatre, cinema, auditorium, stadium stands",
  },
  {
    id: "TABLES",
    emoji: "🪑",
    title: "Table seating",
    subtitle: "Audience sits at round tables. Buyers pick a chair at a table.",
    example: "Comedy club, ghazal / qawwali night, party, award show",
  },
  {
    id: "MIXED",
    emoji: "🏟️",
    title: "Mixed (standing + seats)",
    subtitle: "A standing area plus seated sections or tables in one event.",
    example: "Concert with GA floor + seated balcony",
  },
];

export const KIND_LABELS: Record<SectionKind, { title: string; hint: string }> = {
  ROWS: { title: "Rows of seats", hint: "Numbered seats in rows" },
  TABLES: { title: "Table seating", hint: "Round tables with chairs" },
  STANDING: { title: "Standing area", hint: "No seat numbers, just a capacity" },
};

/** Which section types can be added in each mode. */
export function kindsForMode(mode: SeatingMode): SectionKind[] {
  if (mode === "THEATRE") return ["ROWS"];
  if (mode === "TABLES") return ["TABLES"];
  if (mode === "MIXED") return ["STANDING", "ROWS", "TABLES"];
  return [];
}

let idCounter = 0;
export function newSectionId() {
  idCounter += 1;
  return `sec-${Date.now().toString(36)}-${idCounter}`;
}

/** Row label for an index: 0 → A, 25 → Z, 26 → AA, 27 → AB … */
export function rowLabel(index: number): string {
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

/** Index of a row label (inverse of rowLabel). Returns 0 for invalid input. */
export function rowIndex(label: string): number {
  const clean = (label || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!clean) return 0;
  let n = 0;
  for (const ch of clean) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Row labels ("A","B",…) for a section, or table labels ("T1","T2",…). */
export function sectionRows(section: SeatSection): string[] {
  if (section.kind === "TABLES") {
    return Array.from({ length: Math.max(0, section.tables || 0) }, (_, i) => `T${i + 1}`);
  }
  if (section.kind === "ROWS") {
    const start = rowIndex(section.startRow || "A");
    return Array.from({ length: Math.max(0, section.rowCount || 0) }, (_, i) => rowLabel(start + i));
  }
  return [];
}

export function seatsPerRowOf(section: SeatSection): number {
  if (section.kind === "TABLES") return Math.max(0, section.seatsPerTable || 0);
  if (section.kind === "ROWS") return Math.max(0, section.seatsPerRow || 0);
  return 0;
}

/** Drop blocked/accessible marks that no longer exist after rows/seats were reduced. */
function validKeySet(section: SeatSection): Set<string> {
  const keys = new Set<string>();
  const perRow = seatsPerRowOf(section);
  for (const r of sectionRows(section)) for (let n = 1; n <= perRow; n++) keys.add(`${r}-${n}`);
  return keys;
}

export function cleanMarks(section: SeatSection): SeatSection {
  if (section.kind === "STANDING") return section;
  const valid = validKeySet(section);
  return {
    ...section,
    blocked: (section.blocked || []).filter((k) => valid.has(k)),
    accessible: (section.accessible || []).filter((k) => valid.has(k)),
  };
}

/** Seats (or people for standing areas) that can be sold in a section. */
export function sectionCapacity(section: SeatSection): number {
  if (section.kind === "STANDING") return Math.max(0, section.capacity || 0);
  const s = cleanMarks(section);
  return Math.max(0, sectionRows(s).length * seatsPerRowOf(s) - (s.blocked?.length || 0));
}

/** Capacity per ticket category name (lower-cased). */
export function capacityByTier(sections: SeatSection[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sections) {
    const key = s.tierName.trim().toLowerCase();
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + sectionCapacity(s));
  }
  return map;
}

export function markOf(section: SeatSection, key: string): SeatMark {
  if (section.blocked?.includes(key)) return "blocked";
  if (section.accessible?.includes(key)) return "accessible";
  return "normal";
}

/** Cycles a seat: normal → wheelchair → blocked → normal. */
export function cycleMark(section: SeatSection, key: string): SeatSection {
  const current = markOf(section, key);
  const blocked = (section.blocked || []).filter((k) => k !== key);
  const accessible = (section.accessible || []).filter((k) => k !== key);
  if (current === "normal") accessible.push(key);
  if (current === "accessible") blocked.push(key);
  return { ...section, blocked, accessible };
}

export function makeSection(kind: SectionKind, name: string, tierName: string, startRow = "A"): SeatSection {
  if (kind === "STANDING") return { id: newSectionId(), kind, name, tierName, capacity: 200 };
  if (kind === "TABLES") return { id: newSectionId(), kind, name, tierName, tables: 10, seatsPerTable: 8, blocked: [], accessible: [] };
  return { id: newSectionId(), kind, name, tierName, rowCount: 5, startRow, seatsPerRow: 12, blocked: [], accessible: [] };
}

/** Next free row letter after all ROWS sections, so new sections continue A–E → F… */
export function nextStartRow(sections: SeatSection[]): string {
  let next = 0;
  for (const s of sections) {
    if (s.kind !== "ROWS") continue;
    next = Math.max(next, rowIndex(s.startRow || "A") + (s.rowCount || 0));
  }
  return rowLabel(next);
}

// ---------------------------------------------------------------------------
// Ready-made templates (one click to a sensible layout)
// ---------------------------------------------------------------------------

export interface SeatingTemplate {
  id: string;
  title: string;
  description: string;
  /** Ticket categories the template needs (created if missing). Price in cents. */
  tiers: Array<{ name: string; priceCents: number }>;
  build: () => SeatSection[];
}

export const TEMPLATES: Record<Exclude<SeatingMode, "GENERAL">, SeatingTemplate[]> = {
  THEATRE: [
    {
      id: "small-hall",
      title: "Small hall",
      description: "1 section · 6 rows × 12 seats",
      tiers: [{ name: "Standard", priceCents: 4000 }],
      build: () => [{ ...makeSection("ROWS", "Main Hall", "Standard"), rowCount: 6, seatsPerRow: 12 }],
    },
    {
      id: "theatre-vip",
      title: "Theatre with VIP rows",
      description: "VIP 3 rows · Standard 10 rows",
      tiers: [
        { name: "VIP", priceCents: 12000 },
        { name: "Standard", priceCents: 6000 },
      ],
      build: () => [
        { ...makeSection("ROWS", "VIP Front", "VIP", "A"), rowCount: 3, seatsPerRow: 14 },
        { ...makeSection("ROWS", "Stalls", "Standard", "D"), rowCount: 10, seatsPerRow: 18 },
      ],
    },
    {
      id: "cinema",
      title: "Cinema",
      description: "Standard 8 rows · Recliner 2 rows",
      tiers: [
        { name: "Standard", priceCents: 2000 },
        { name: "Recliner", priceCents: 3500 },
      ],
      build: () => [
        { ...makeSection("ROWS", "Standard", "Standard", "A"), rowCount: 8, seatsPerRow: 16 },
        { ...makeSection("ROWS", "Recliners", "Recliner", "I"), rowCount: 2, seatsPerRow: 10 },
      ],
    },
  ],
  TABLES: [
    {
      id: "music-night",
      title: "Music / ghazal night",
      description: "VIP 4 tables · Standard 12 tables (8 chairs each)",
      tiers: [
        { name: "VIP Table", priceCents: 7500 },
        { name: "Standard Table", priceCents: 4000 },
      ],
      build: () => [
        { ...makeSection("TABLES", "VIP Tables", "VIP Table"), tables: 4, seatsPerTable: 8 },
        { ...makeSection("TABLES", "Main Floor", "Standard Table"), tables: 12, seatsPerTable: 8 },
      ],
    },
    {
      id: "comedy",
      title: "Comedy club",
      description: "15 small tables · 4 chairs each",
      tiers: [{ name: "Table Seat", priceCents: 4500 }],
      build: () => [{ ...makeSection("TABLES", "Club Floor", "Table Seat"), tables: 15, seatsPerTable: 4 }],
    },
  ],
  MIXED: [
    {
      id: "concert",
      title: "Concert",
      description: "Standing floor 500 · Seated balcony 6 rows",
      tiers: [
        { name: "General Standing", priceCents: 8000 },
        { name: "Balcony Seat", priceCents: 11000 },
      ],
      build: () => [
        { ...makeSection("STANDING", "Standing Floor", "General Standing"), capacity: 500 },
        { ...makeSection("ROWS", "Balcony", "Balcony Seat"), rowCount: 6, seatsPerRow: 20 },
      ],
    },
    {
      id: "club-vip",
      title: "Club night + VIP tables",
      description: "Dance floor 300 · VIP 6 tables of 6",
      tiers: [
        { name: "General Entry", priceCents: 3000 },
        { name: "VIP Table", priceCents: 15000 },
      ],
      build: () => [
        { ...makeSection("STANDING", "Dance Floor", "General Entry"), capacity: 300 },
        { ...makeSection("TABLES", "VIP Lounge", "VIP Table"), tables: 6, seatsPerTable: 6 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Conversion to / from the API format
// ---------------------------------------------------------------------------

export function toApiConfig(mode: SeatingMode, sections: SeatSection[]): SeatingConfigPayload | null {
  if (mode === "GENERAL") return null;
  return {
    version: 2,
    layout: mode,
    stageLabel: "Stage",
    sections: sections.map((raw) => {
      const s = cleanMarks(raw);
      const base = { id: s.id, name: s.name.trim(), tierName: s.tierName.trim(), kind: s.kind };
      if (s.kind === "STANDING") return { ...base, capacity: s.capacity || 0 };
      if (s.kind === "TABLES") {
        return { ...base, tables: s.tables || 0, seatsPerTable: s.seatsPerTable || 0, blocked: s.blocked || [], accessible: s.accessible || [] };
      }
      return { ...base, rows: sectionRows(s), seatsPerRow: s.seatsPerRow || 0, blocked: s.blocked || [], accessible: s.accessible || [] };
    }),
  };
}

interface ApiSection {
  id?: string;
  name?: string;
  tierName?: string;
  kind?: SectionKind;
  rows?: string[];
  seatsPerRow?: number;
  tables?: number;
  seatsPerTable?: number;
  capacity?: number;
  blocked?: string[];
  accessible?: string[];
}

/** Reads a saved seatingConfig (any version) back into builder state. */
export function fromApiConfig(
  seatingType: string | undefined,
  config: { layout?: string; sections?: ApiSection[] } | null | undefined
): { mode: SeatingMode; sections: SeatSection[]; customRows: boolean } {
  if (seatingType !== "RESERVED" || !config?.sections?.length) return { mode: "GENERAL", sections: [], customRows: false };
  let customRows = false;
  const sections: SeatSection[] = config.sections.map((s) => {
    const kind: SectionKind = s.kind === "TABLES" || s.kind === "STANDING" ? s.kind : "ROWS";
    const base = { id: s.id || newSectionId(), name: s.name || "Section", tierName: s.tierName || "", kind };
    if (kind === "STANDING") return { ...base, capacity: s.capacity || 0 };
    if (kind === "TABLES") {
      return {
        ...base,
        tables: s.tables || s.rows?.length || 0,
        seatsPerTable: s.seatsPerTable || s.seatsPerRow || 0,
        blocked: s.blocked || [],
        accessible: s.accessible || [],
      };
    }
    const rows = (s.rows || []).map((r) => String(r).toUpperCase());
    const start = rows[0] || "A";
    // Builder only supports consecutive letters; flag layouts that used custom row names
    const consecutive = rows.every((r, i) => r === rowLabel(rowIndex(start) + i));
    if (!consecutive) customRows = true;
    return {
      ...base,
      startRow: start,
      rowCount: rows.length,
      seatsPerRow: s.seatsPerRow || 0,
      blocked: s.blocked || [],
      accessible: s.accessible || [],
    };
  });
  const kinds = new Set(sections.map((s) => s.kind));
  const layout = config.layout;
  const mode: SeatingMode =
    layout === "THEATRE" || layout === "TABLES" || layout === "MIXED"
      ? layout
      : kinds.size > 1 || kinds.has("STANDING")
        ? "MIXED"
        : kinds.has("TABLES")
          ? "TABLES"
          : "THEATRE";
  return { mode, sections, customRows };
}

/** Human-readable problems that must be fixed before saving. Empty = OK. */
export function validateSeating(mode: SeatingMode, sections: SeatSection[], tierNames: string[]): string[] {
  if (mode === "GENERAL") return [];
  const problems: string[] = [];
  const tiers = new Set(tierNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  if (sections.length === 0) problems.push("Add at least one section to your seat map.");
  if (!sections.some((s) => s.kind !== "STANDING")) {
    problems.push("Add at least one seated section or tables (or choose “Open space / Standing”).");
  }
  const names = new Set<string>();
  for (const s of sections) {
    const label = s.name.trim() || "A section";
    if (!s.name.trim()) problems.push("Every section needs a name.");
    if (s.name.includes(":")) problems.push(`“${label}”: section names can’t contain “:”.`);
    const key = s.name.trim().toLowerCase();
    if (key && names.has(key)) problems.push(`Two sections are called “${label}”. Use different names.`);
    names.add(key);
    if (!s.tierName.trim() || !tiers.has(s.tierName.trim().toLowerCase())) {
      problems.push(`“${label}”: choose a ticket category.`);
    }
    if (sectionCapacity(s) <= 0) problems.push(`“${label}” has no seats or capacity.`);
  }
  return Array.from(new Set(problems));
}
