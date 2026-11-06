import { AppError } from "../../utils/errors.js";

/**
 * Seat map ("seatingConfig") helpers shared by event creation/update and seat holds.
 *
 * Events use seatingType "GENERAL" (no seat map, buyers pick a quantity) or "RESERVED"
 * (a seat map exists). A RESERVED seatingConfig looks like:
 *
 *   {
 *     version: 2,
 *     layout: "THEATRE" | "TABLES" | "MIXED",
 *     stageLabel: "Stage",
 *     sections: [
 *       { id, name, tierName, kind: "ROWS",     rows: ["A","B"], seatsPerRow: 10, blocked: ["A-5"], accessible: ["A-1"] },
 *       { id, name, tierName, kind: "TABLES",   tables: 8, seatsPerTable: 6, blocked: [], accessible: [] },
 *       { id, name, tierName, kind: "STANDING", capacity: 300 }
 *     ]
 *   }
 *
 * Seat keys are "<section name>:<row>-<seat number>", e.g. "Stalls:A-4" or "Club:T3-2"
 * (tables use row labels T1, T2, ...). Sections saved before version 2 have no `kind`
 * and are treated as ROWS.
 *
 * For backward compatibility with older app builds, normalisation also stores `rows` and
 * `seatsPerRow` for TABLES (one "row" per table) and empty values for STANDING zones.
 */

export const SECTION_KINDS = ["ROWS", "TABLES", "STANDING"];
export const LAYOUTS = ["THEATRE", "TABLES", "MIXED"];

const MAX_SECTIONS = 50;
const MAX_ROWS = 100;
const MAX_SEATS_PER_ROW = 200;
const MAX_TABLES = 300;
const MAX_SEATS_PER_TABLE = 30;
const MAX_STANDING_CAPACITY = 200000;

function bad(message) {
  return new AppError("VALIDATION_ERROR", 400, `Seat map: ${message}`);
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : NaN;
}

function cleanSeatList(list, validKeys) {
  if (!Array.isArray(list)) return [];
  const out = new Set();
  for (const k of list) {
    const key = String(k).trim().toUpperCase();
    if (validKeys.has(key)) out.add(key);
  }
  return Array.from(out);
}

/** Returns `["T1", ..., "Tn"]`. */
export function tableLabels(count) {
  return Array.from({ length: count }, (_, i) => `T${i + 1}`);
}

/** All seat keys (without section prefix) a ROWS/TABLES section physically has. */
function allSeatKeys(section) {
  const keys = [];
  for (const row of section.rows) {
    for (let n = 1; n <= section.seatsPerRow; n++) keys.push(`${row}-${n}`);
  }
  return keys;
}

/**
 * Validates and normalises a seating config. Throws a 400 AppError with a readable
 * message when the config is unusable. Returns null for GENERAL events.
 */
export function normalizeSeatingConfig(seatingType, raw) {
  if (seatingType !== "RESERVED") return null;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.sections)) {
    throw bad("add at least one section.");
  }
  if (raw.sections.length === 0) throw bad("add at least one section.");
  if (raw.sections.length > MAX_SECTIONS) throw bad(`a maximum of ${MAX_SECTIONS} sections is allowed.`);

  const seenNames = new Set();
  const sections = raw.sections.map((s, idx) => {
    if (!s || typeof s !== "object") throw bad(`section ${idx + 1} is invalid.`);
    const name = String(s.name ?? "").trim();
    if (!name) throw bad(`section ${idx + 1} needs a name.`);
    if (name.length > 60) throw bad(`section name "${name}" is too long (max 60 characters).`);
    if (name.includes(":")) throw bad(`section name "${name}" cannot contain ":".`);
    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) throw bad(`two sections are both called "${name}". Section names must be unique.`);
    seenNames.add(nameKey);

    const tierName = String(s.tierName ?? "").trim();
    if (!tierName) throw bad(`choose a ticket category for "${name}".`);

    const kind = SECTION_KINDS.includes(s.kind) ? s.kind : "ROWS";
    const base = { id: String(s.id || `sec-${idx + 1}`), name, tierName, kind };

    if (kind === "STANDING") {
      const capacity = toInt(s.capacity);
      if (!(capacity >= 1 && capacity <= MAX_STANDING_CAPACITY)) {
        throw bad(`"${name}" needs a capacity between 1 and ${MAX_STANDING_CAPACITY}.`);
      }
      return { ...base, capacity, rows: [], seatsPerRow: 0 };
    }

    let rows;
    let seatsPerRow;
    let extra = {};
    if (kind === "TABLES") {
      const tables = toInt(s.tables);
      const seatsPerTable = toInt(s.seatsPerTable);
      if (!(tables >= 1 && tables <= MAX_TABLES)) throw bad(`"${name}" needs between 1 and ${MAX_TABLES} tables.`);
      if (!(seatsPerTable >= 1 && seatsPerTable <= MAX_SEATS_PER_TABLE)) {
        throw bad(`"${name}" needs between 1 and ${MAX_SEATS_PER_TABLE} seats per table.`);
      }
      rows = tableLabels(tables);
      seatsPerRow = seatsPerTable;
      extra = { tables, seatsPerTable };
    } else {
      rows = Array.isArray(s.rows)
        ? s.rows.map((r) => String(r).trim().toUpperCase()).filter(Boolean)
        : [];
      if (rows.length === 0) throw bad(`"${name}" needs at least one row.`);
      if (rows.length > MAX_ROWS) throw bad(`"${name}" can have at most ${MAX_ROWS} rows.`);
      const seenRows = new Set();
      for (const r of rows) {
        if (!/^[A-Z0-9]{1,6}$/.test(r)) throw bad(`row label "${r}" in "${name}" may only use letters and numbers.`);
        if (seenRows.has(r)) throw bad(`row "${r}" appears twice in "${name}".`);
        seenRows.add(r);
      }
      seatsPerRow = toInt(s.seatsPerRow);
      if (!(seatsPerRow >= 1 && seatsPerRow <= MAX_SEATS_PER_ROW)) {
        throw bad(`"${name}" needs between 1 and ${MAX_SEATS_PER_ROW} seats per row.`);
      }
    }

    const section = { ...base, ...extra, rows, seatsPerRow };
    const validKeys = new Set(allSeatKeys(section));
    section.blocked = cleanSeatList(s.blocked, validKeys);
    const blockedSet = new Set(section.blocked);
    section.accessible = cleanSeatList(s.accessible, validKeys).filter((k) => !blockedSet.has(k));
    if (section.blocked.length >= validKeys.size) throw bad(`every seat in "${name}" is blocked.`);
    return section;
  });

  const kinds = new Set(sections.map((s) => s.kind));
  let layout = LAYOUTS.includes(raw.layout) ? raw.layout : null;
  if (!layout) {
    layout = kinds.size > 1 || kinds.has("STANDING") ? "MIXED" : kinds.has("TABLES") ? "TABLES" : "THEATRE";
  }
  if (!sections.some((s) => s.kind !== "STANDING")) {
    throw bad("add at least one seated section (rows or tables). For standing-only events choose Open / Standing.");
  }

  const stageLabel = String(raw.stageLabel ?? "Stage").trim().slice(0, 40) || "Stage";
  return { version: 2, layout, stageLabel, sections };
}

/** Sections that sell numbered seats. */
export function seatedSections(config) {
  return (config?.sections || []).filter((s) => (s.kind || "ROWS") !== "STANDING");
}

/** Number of sellable seats in a ROWS/TABLES section. */
export function sellableSeatCount(section) {
  const rows = Array.isArray(section.rows) ? section.rows.length : 0;
  const total = rows * (Number(section.seatsPerRow) || 0);
  const blocked = Array.isArray(section.blocked) ? section.blocked.length : 0;
  return Math.max(0, total - blocked);
}

/**
 * Capacity per ticket category name (lower-cased) implied by the seat map:
 * sellable seats for seated sections, `capacity` for standing zones.
 */
export function capacityByTier(config) {
  const map = new Map();
  for (const s of config?.sections || []) {
    const key = String(s.tierName || "").trim().toLowerCase();
    if (!key) continue;
    const cap = (s.kind || "ROWS") === "STANDING" ? Number(s.capacity) || 0 : sellableSeatCount(s);
    map.set(key, (map.get(key) || 0) + cap);
  }
  return map;
}

/** True when buyers of this ticket category must pick specific seats. */
export function isSeatedTier(config, tierName) {
  const key = String(tierName || "").trim().toLowerCase();
  return seatedSections(config).some((s) => String(s.tierName || "").trim().toLowerCase() === key);
}

/**
 * Checks that every ticket category referenced by the seat map exists.
 * `tierNames` is the list of ticket category names on the event.
 */
export function assertTiersExist(config, tierNames) {
  if (!config) return;
  const names = new Set(tierNames.map((n) => String(n).trim().toLowerCase()));
  for (const s of config.sections) {
    if (!names.has(s.tierName.trim().toLowerCase())) {
      throw bad(`section "${s.name}" uses ticket category "${s.tierName}", which does not exist.`);
    }
  }
}

/**
 * Validates seats a buyer wants to hold for one ticket category.
 * Returns normalised seat keys ("Section:Row-Num").
 */
export function validateSelectedSeats(config, tierName, selectedSeats, quantity) {
  const seated = isSeatedTier(config, tierName);
  const seats = Array.isArray(selectedSeats) ? selectedSeats : [];

  if (!seated) {
    if (seats.length > 0) {
      throw new AppError("VALIDATION_ERROR", 400, "This ticket category has no numbered seats. Choose a quantity instead.");
    }
    return null;
  }

  if (seats.length === 0) {
    throw new AppError("SEATS_REQUIRED", 400, "Please pick your seats on the seat map.");
  }
  if (seats.length !== quantity) {
    throw new AppError("VALIDATION_ERROR", 400, "The number of seats must match the ticket quantity.");
  }

  const tierKey = String(tierName).trim().toLowerCase();
  const sectionsByName = new Map(seatedSections(config).map((s) => [s.name.toLowerCase(), s]));
  const normalized = [];
  const seen = new Set();

  for (const raw of seats) {
    if (typeof raw !== "string") throw new AppError("VALIDATION_ERROR", 400, "Invalid seat selection.");
    const colon = raw.indexOf(":");
    if (colon === -1) throw new AppError("VALIDATION_ERROR", 400, `Seat "${raw}" is missing its section.`);
    const sectionName = raw.slice(0, colon);
    const rest = raw.slice(colon + 1).toUpperCase();
    const dash = rest.lastIndexOf("-");
    const row = dash === -1 ? "" : rest.slice(0, dash);
    const num = dash === -1 ? NaN : Number(rest.slice(dash + 1));

    const section = sectionsByName.get(sectionName.toLowerCase());
    const valid =
      section &&
      section.rows.includes(row) &&
      Number.isInteger(num) &&
      num >= 1 &&
      num <= section.seatsPerRow;
    if (!valid) throw new AppError("INVALID_SEAT", 400, `Seat "${raw}" does not exist on this seat map.`);
    if (String(section.tierName).trim().toLowerCase() !== tierKey) {
      throw new AppError("INVALID_SEAT", 400, `Seat "${raw}" belongs to a different ticket category.`);
    }
    const plain = `${row}-${num}`;
    if ((section.blocked || []).includes(plain)) {
      throw new AppError("INVALID_SEAT", 400, `Seat "${raw}" is not available for sale.`);
    }
    const key = `${section.name}:${plain}`;
    if (seen.has(key)) throw new AppError("VALIDATION_ERROR", 400, `Seat "${raw}" was selected twice.`);
    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}
