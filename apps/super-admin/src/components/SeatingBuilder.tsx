"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles, Lock, Accessibility, Ban, Users, Armchair, UtensilsCrossed, AlertTriangle, Paintbrush } from "lucide-react";
import {
  type SeatingMode,
  type SeatSection,
  type SectionKind,
  type SeatingTemplate,
  MODE_OPTIONS,
  KIND_LABELS,
  TEMPLATES,
  kindsForMode,
  makeSection,
  nextStartRow,
  sectionRows,
  seatsPerRowOf,
  sectionCapacity,
  capacityByTier,
  markOf,
  cycleMark,
  cleanMarks,
  rowLabel,
  rowIndex,
  tierOfSeat,
  setSeatTier,
  setRowTier,
} from "@/lib/seating";

/** What tapping a seat in a preview does. */
type Tool = { type: "marks" } | { type: "tier"; tier: string };

/** Colours used to show each ticket category on the seat map (by category order). */
const TIER_COLORS = [
  { seat: "bg-amber-400 text-slate-900", swatch: "bg-amber-400" },
  { seat: "bg-sky-400 text-slate-900", swatch: "bg-sky-400" },
  { seat: "bg-violet-400 text-slate-900", swatch: "bg-violet-400" },
  { seat: "bg-emerald-400 text-slate-900", swatch: "bg-emerald-400" },
  { seat: "bg-rose-400 text-slate-900", swatch: "bg-rose-400" },
  { seat: "bg-orange-400 text-slate-900", swatch: "bg-orange-400" },
  { seat: "bg-teal-400 text-slate-900", swatch: "bg-teal-400" },
  { seat: "bg-fuchsia-400 text-slate-900", swatch: "bg-fuchsia-400" },
];
const UNKNOWN_TIER_COLOR = { seat: "bg-slate-600 text-slate-200", swatch: "bg-slate-600" };

export interface BuilderTier {
  name: string;
  priceCents: number | string;
}

interface SeatingBuilderProps {
  mode: SeatingMode;
  onModeChange: (mode: SeatingMode) => void;
  sections: SeatSection[];
  onSectionsChange: (sections: SeatSection[]) => void;
  tiers: BuilderTier[];
  /** Creates a ticket category and returns its final (unique) name. */
  onAddTier: (suggestedName: string, priceCents?: number) => string;
  /** Called when a template is applied so the page can create the template's categories. */
  onApplyTemplate: (template: SeatingTemplate) => void;
  /** When true the layout can be viewed but not changed (e.g. tickets already sold). */
  locked?: boolean;
  lockedReason?: string;
}

const NEW_TIER = "__new_category__";
const MAX_PREVIEW_ROWS = 30;
const MAX_PREVIEW_SEATS = 40;
const MAX_PREVIEW_TABLES = 60;

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:bg-slate-50 disabled:text-slate-500";
const labelCls = "block text-[13px] font-semibold text-slate-700 mb-1";

function KindIcon({ kind, className = "w-4 h-4" }: { kind: SectionKind; className?: string }) {
  if (kind === "STANDING") return <Users className={className} />;
  if (kind === "TABLES") return <UtensilsCrossed className={className} />;
  return <Armchair className={className} />;
}

function clampInt(value: string, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** One clickable seat in the preview, coloured by its ticket category. */
function SeatDot({
  label,
  mark,
  colorCls,
  onApply,
  dragPaint,
  disabled,
  title,
}: {
  label: string;
  mark: "normal" | "accessible" | "blocked";
  colorCls: string;
  onApply: () => void;
  /** When true, dragging across seats with the mouse button held applies the tool too. */
  dragPaint: boolean;
  disabled?: boolean;
  title: string;
}) {
  const cls =
    mark === "blocked"
      ? "border border-dashed border-slate-500 bg-transparent text-slate-500"
      : `${colorCls} ${mark === "accessible" ? "ring-2 ring-white/90" : ""}`;
  return (
    <button
      type="button"
      // Pointer down applies immediately (and starts a drag); click only handles keyboard activation
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        e.preventDefault();
        onApply();
      }}
      onPointerEnter={(e) => {
        if (!disabled && dragPaint && e.buttons === 1) onApply();
      }}
      onClick={(e) => {
        if (!disabled && e.detail === 0) onApply();
      }}
      disabled={disabled}
      title={title}
      className={`w-5 h-5 shrink-0 rounded-[5px] text-[10px] font-semibold flex items-center justify-center transition-transform select-none ${cls} ${
        disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
      }`}
    >
      {mark === "accessible" ? "♿" : mark === "blocked" ? "×" : label}
    </button>
  );
}

function SectionPreview({
  section,
  onChange,
  locked,
  tool,
  colorFor,
}: {
  section: SeatSection;
  onChange: (s: SeatSection) => void;
  locked?: boolean;
  tool: Tool;
  colorFor: (tierName: string) => { seat: string; swatch: string };
}) {
  const s = cleanMarks(section);
  const rows = sectionRows(s);
  const perRow = seatsPerRowOf(s);
  const painting = tool.type === "tier";

  const apply = (key: string) => {
    if (locked) return;
    if (tool.type === "tier") {
      if (markOf(s, key) === "blocked") return; // blocked seats aren't sold
      onChange(setSeatTier(s, key, tool.tier));
    } else {
      onChange(cycleMark(s, key));
    }
  };
  const paintRow = (row: string) => {
    if (!locked && tool.type === "tier") onChange(setRowTier(s, row, tool.tier));
  };
  const seatTitle = (key: string) => {
    const mark = markOf(s, key);
    const place = s.kind === "TABLES" ? key.replace(/^T(\d+)-/, "Table $1 · Chair ") : key.replace("-", "");
    const what = mark === "blocked" ? "Blocked (not for sale)" : `${tierOfSeat(s, key)}${mark === "accessible" ? " · Wheelchair" : ""}`;
    const hint = locked ? "" : painting ? ` — tap to make it ${tool.tier}` : " — tap: normal → wheelchair → blocked";
    return `${place}: ${what}${hint}`;
  };
  const dot = (key: string, label: string) => (
    <SeatDot
      key={key}
      label={label}
      mark={markOf(s, key)}
      colorCls={colorFor(tierOfSeat(s, key)).seat}
      onApply={() => apply(key)}
      dragPaint={painting}
      disabled={locked}
      title={seatTitle(key)}
    />
  );
  const rowLabelCls = `text-[11px] font-semibold text-slate-400 ${
    painting && !locked ? "cursor-pointer hover:text-white underline decoration-dotted underline-offset-2" : "cursor-default"
  }`;

  if (s.kind === "TABLES") {
    const shown = rows.slice(0, MAX_PREVIEW_TABLES);
    return (
      <div>
        <div className="flex flex-wrap gap-3 justify-center">
          {shown.map((t) => (
            <div key={t} className="relative w-24 h-24">
              <button
                type="button"
                onClick={() => paintRow(t)}
                disabled={locked || !painting}
                title={painting && !locked ? `Make every chair at ${t} “${tool.tier}”` : t}
                className={`absolute inset-5 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-xs font-semibold text-slate-200 ${
                  painting && !locked ? "cursor-pointer hover:border-white" : "cursor-default"
                }`}
              >
                {t}
              </button>
              {Array.from({ length: perRow }, (_, i) => {
                const angle = (2 * Math.PI * i) / perRow - Math.PI / 2;
                const key = `${t}-${i + 1}`;
                return (
                  <div
                    key={key}
                    className="absolute"
                    style={{ left: `calc(50% + ${Math.cos(angle) * 38}px - 10px)`, top: `calc(50% + ${Math.sin(angle) * 38}px - 10px)` }}
                  >
                    {dot(key, String(i + 1))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {rows.length > shown.length && (
          <p className="text-center text-xs text-slate-500 mt-2">+ {rows.length - shown.length} more tables (same layout)</p>
        )}
      </div>
    );
  }

  const shownRows = rows.slice(0, MAX_PREVIEW_ROWS);
  const shownSeats = Math.min(perRow, MAX_PREVIEW_SEATS);
  return (
    <div className="overflow-x-auto">
      <div className="space-y-1 min-w-fit mx-auto w-fit">
        {shownRows.map((r) => (
          <div key={r} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => paintRow(r)}
              disabled={locked || !painting}
              title={painting && !locked ? `Make all of row ${r} “${tool.tier}”` : `Row ${r}`}
              className={`w-6 text-right pr-1 ${rowLabelCls}`}
            >
              {r}
            </button>
            {Array.from({ length: shownSeats }, (_, i) => dot(`${r}-${i + 1}`, String(i + 1)))}
            {perRow > shownSeats && <span className="text-[11px] text-slate-500 ml-1">+{perRow - shownSeats}</span>}
          </div>
        ))}
      </div>
      {rows.length > shownRows.length && (
        <p className="text-center text-xs text-slate-500 mt-2">+ {rows.length - shownRows.length} more rows</p>
      )}
    </div>
  );
}

export default function SeatingBuilder({
  mode,
  onModeChange,
  sections,
  onSectionsChange,
  tiers,
  onAddTier,
  onApplyTemplate,
  locked = false,
  lockedReason,
}: SeatingBuilderProps) {
  const [newTierNote, setNewTierNote] = useState("");
  const [tool, setTool] = useState<Tool>({ type: "marks" });
  const allowedKinds = kindsForMode(mode);
  const tierNames = tiers.map((t) => String(t.name || "").trim()).filter(Boolean);
  const caps = capacityByTier(sections);
  const totalCapacity = sections.reduce((sum, s) => sum + sectionCapacity(s), 0);
  const hasSeatedSection = sections.some((s) => s.kind !== "STANDING");

  const colorFor = (tierName: string) => {
    const idx = tierNames.findIndex((n) => n.toLowerCase() === tierName.trim().toLowerCase());
    return idx === -1 ? UNKNOWN_TIER_COLOR : TIER_COLORS[idx % TIER_COLORS.length];
  };
  // If the selected paint category was renamed or deleted, fall back to the wheelchair/block tool
  const activeTool: Tool =
    tool.type === "tier" && !tierNames.some((n) => n.toLowerCase() === tool.tier.toLowerCase()) ? { type: "marks" } : tool;

  const updateSection = (idx: number, patch: Partial<SeatSection> | SeatSection) => {
    const next = [...sections];
    next[idx] = cleanMarks({ ...next[idx], ...patch });
    onSectionsChange(next);
  };

  const removeSection = (idx: number) => onSectionsChange(sections.filter((_, i) => i !== idx));

  const addSection = (kind: SectionKind) => {
    const count = sections.filter((s) => s.kind === kind).length + 1;
    const baseName = kind === "STANDING" ? "Standing Area" : kind === "TABLES" ? "Tables" : "Section";
    let name = count === 1 && kind === "STANDING" ? baseName : `${baseName} ${count}`;
    const taken = new Set(sections.map((s) => s.name.trim().toLowerCase()));
    let n = count;
    while (taken.has(name.toLowerCase())) name = `${baseName} ${++n}`;
    onSectionsChange([...sections, makeSection(kind, name, tierNames[0] || "", nextStartRow(sections))]);
  };

  const chooseMode = (m: SeatingMode) => {
    if (locked || m === mode) return;
    onModeChange(m);
    // Remove section types the new mode doesn't support; start with one section if empty
    const allowed = kindsForMode(m);
    const kept = sections.filter((s) => allowed.includes(s.kind));
    if (m !== "GENERAL" && kept.length === 0) {
      const firstKind: SectionKind = m === "TABLES" ? "TABLES" : "ROWS";
      kept.push(makeSection(firstKind, firstKind === "TABLES" ? "Tables 1" : "Section 1", tierNames[0] || ""));
    }
    onSectionsChange(m === "GENERAL" ? [] : kept);
  };

  const applyTemplate = (tpl: SeatingTemplate) => {
    if (locked) return;
    if (sections.length > 0 && !window.confirm(`Replace your current layout with “${tpl.title}”?`)) return;
    onApplyTemplate(tpl);
    onSectionsChange(tpl.build());
  };

  const handleTierSelect = (idx: number, value: string) => {
    if (value === NEW_TIER) {
      const name = onAddTier(sections[idx].name.trim() || "New Category");
      updateSection(idx, { tierName: name });
      setNewTierNote(`New ticket category “${name}” added — set its price in Ticket Categories below.`);
      return;
    }
    updateSection(idx, { tierName: value });
  };

  return (
    <div className="space-y-6">
      {locked && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[13px] font-semibold">
          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span>{lockedReason || "The seat layout is locked."}</span>
        </div>
      )}

      {/* Step 1 — how will people attend? */}
      <div>
        <p className="text-[13px] font-semibold text-slate-900 mb-3">1. How will people attend this event?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => chooseMode(opt.id)}
                disabled={locked && !active}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  active
                    ? "border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/20"
                    : "border-slate-100 bg-slate-50/40 hover:border-slate-200 disabled:opacity-50 disabled:hover:border-slate-100"
                } ${locked ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-900">
                    <span className="mr-1.5">{opt.emoji}</span>
                    {opt.title}
                  </span>
                  {active && (
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[13px] font-semibold shrink-0">✓</span>
                  )}
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{opt.subtitle}</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">e.g. {opt.example}</p>
              </button>
            );
          })}
        </div>
        {mode === "GENERAL" && (
          <p className="mt-3 text-[13px] font-semibold text-slate-500">
            ✓ Nothing else to set up. Buyers choose a ticket category and quantity. The “Total Tickets” you set in each category is the limit.
          </p>
        )}
      </div>

      {mode !== "GENERAL" && (
        <>
          {/* Step 2 — quick start */}
          {!locked && (
            <div>
              <p className="text-[13px] font-semibold text-slate-900 mb-1">2. Start from a ready-made layout <span className="text-slate-400 font-semibold">(optional)</span></p>
              <p className="text-[13px] text-slate-400 font-medium mb-3">Pick one and adjust it, or build your own below. Missing ticket categories are created for you.</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES[mode].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="flex items-start gap-2 text-left px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-[13px] font-semibold text-slate-900">{tpl.title}</span>
                      <span className="block text-xs text-slate-500">{tpl.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — sections */}
          <div>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">{locked ? "Layout" : "3. Build your layout"}</p>
            {!locked && (
              <p className="text-[13px] text-slate-500 mb-3">
                Set the size of each section, then use the seat tools below to decide exactly what every seat is.
              </p>
            )}
            {newTierNote && !locked && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold">{newTierNote}</div>
            )}

            {/* Seat tools: what a tap on a seat does */}
            {!locked && hasSeatedSection && (
              <div className="sticky top-16 z-10 mb-4 rounded-xl border border-slate-200 bg-white/95 backdrop-blur p-3 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Paintbrush className="w-4 h-4 text-amber-600" />
                  <span className="text-[13px] font-semibold text-slate-900">Seat tools — choose what tapping a seat does</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tierNames.map((n) => {
                    const active = activeTool.type === "tier" && activeTool.tier.toLowerCase() === n.toLowerCase();
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setTool({ type: "tier", tier: n })}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer ${
                          active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-sm ${colorFor(n).swatch}`} />
                        Make seats {n}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setTool({ type: "marks" })}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer ${
                      activeTool.type === "marks" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Accessibility className="w-3.5 h-3.5" /> Wheelchair / <Ban className="w-3.5 h-3.5" /> Block
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {activeTool.type === "tier"
                    ? `Tap seats (or hold and drag) to make them “${activeTool.tier}”. Tap a row letter or table name to change the whole row/table.`
                    : "Tap a seat: normal → ♿ wheelchair space → blocked (aisle, pillar, not for sale) → normal."}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {sections.map((sec, idx) => {
                const rows = sectionRows(sec);
                const capacity = sectionCapacity(sec);
                const tierMissing = !sec.tierName || !tierNames.some((n) => n.toLowerCase() === sec.tierName.trim().toLowerCase());
                return (
                  <div key={sec.id} className="rounded-xl border border-slate-200/80 bg-slate-50/30 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-100/70 border border-amber-200/70 px-2 py-1 rounded-lg">
                          <KindIcon kind={sec.kind} className="w-3 h-3" /> {KIND_LABELS[sec.kind].title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-slate-700">
                            {capacity} {sec.kind === "STANDING" ? "people" : "seats"}
                          </span>
                          {!locked && sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSection(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove section"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Section name</label>
                          <input
                            type="text"
                            value={sec.name}
                            disabled={locked}
                            onChange={(e) => updateSection(idx, { name: e.target.value.replace(/:/g, "") })}
                            placeholder={sec.kind === "STANDING" ? "e.g. Dance Floor" : sec.kind === "TABLES" ? "e.g. VIP Tables" : "e.g. Balcony"}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>
                            {sec.kind === "STANDING" ? "Sold as ticket category" : "Default category (all seats)"}
                          </label>
                          <select
                            value={tierMissing ? "" : tierNames.find((n) => n.toLowerCase() === sec.tierName.trim().toLowerCase())}
                            disabled={locked}
                            onChange={(e) => handleTierSelect(idx, e.target.value)}
                            className={`${inputCls} ${tierMissing ? "border-red-300" : ""}`}
                          >
                            <option value="" disabled>
                              Choose a category…
                            </option>
                            {tierNames.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                            <option value={NEW_TIER}>＋ Create a new category</option>
                          </select>
                        </div>
                      </div>

                      {/* Kind-specific settings */}
                      {sec.kind === "ROWS" && (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Number of rows</label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              disabled={locked}
                              value={sec.rowCount ?? 0}
                              onChange={(e) => updateSection(idx, { rowCount: clampInt(e.target.value, 1, 100) })}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>First row letter</label>
                            <input
                              type="text"
                              maxLength={2}
                              disabled={locked}
                              value={sec.startRow ?? "A"}
                              onChange={(e) => {
                                const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                                updateSection(idx, { startRow: v ? rowLabel(rowIndex(v)) : "A" });
                              }}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Seats in each row</label>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              disabled={locked}
                              value={sec.seatsPerRow ?? 0}
                              onChange={(e) => updateSection(idx, { seatsPerRow: clampInt(e.target.value, 1, 200) })}
                              className={inputCls}
                            />
                          </div>
                          <p className="col-span-3 text-xs text-slate-500 -mt-1">
                            Rows {rows[0]}–{rows[rows.length - 1]} · seats numbered 1–{sec.seatsPerRow}
                          </p>
                        </div>
                      )}

                      {sec.kind === "TABLES" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Number of tables</label>
                            <input
                              type="number"
                              min={1}
                              max={300}
                              disabled={locked}
                              value={sec.tables ?? 0}
                              onChange={(e) => updateSection(idx, { tables: clampInt(e.target.value, 1, 300) })}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Chairs per table</label>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              disabled={locked}
                              value={sec.seatsPerTable ?? 0}
                              onChange={(e) => updateSection(idx, { seatsPerTable: clampInt(e.target.value, 1, 30) })}
                              className={inputCls}
                            />
                          </div>
                          <p className="col-span-2 text-xs text-slate-500 -mt-1">
                            Tables T1–T{sec.tables} · buyers pick individual chairs at a table
                          </p>
                        </div>
                      )}

                      {sec.kind === "STANDING" && (
                        <div className="max-w-xs">
                          <label className={labelCls}>How many people can enter?</label>
                          <input
                            type="number"
                            min={1}
                            max={200000}
                            disabled={locked}
                            value={sec.capacity ?? 0}
                            onChange={(e) => updateSection(idx, { capacity: clampInt(e.target.value, 1, 200000) })}
                            className={inputCls}
                          />
                          <p className="text-xs text-slate-500 mt-1">No seat numbers — buyers choose a quantity.</p>
                        </div>
                      )}
                    </div>

                    {/* Preview */}
                    {sec.kind !== "STANDING" && (
                      <div className="bg-slate-950 px-3 py-4">
                        <div className="flex items-center justify-between mb-3 text-xs font-semibold">
                          <span className="text-slate-400">Seat map — what buyers will see</span>
                          <span className="flex items-center gap-3 text-slate-400">
                            {Object.keys(cleanMarks(sec).seatTiers || {}).length > 0 && (
                              <span>{Object.keys(cleanMarks(sec).seatTiers || {}).length} seats in other categories</span>
                            )}
                            <span className="inline-flex items-center gap-1"><Accessibility className="w-3 h-3 text-sky-400" />{sec.accessible?.length || 0}</span>
                            <span className="inline-flex items-center gap-1"><Ban className="w-3 h-3 text-slate-500" />{sec.blocked?.length || 0}</span>
                          </span>
                        </div>
                        <SectionPreview
                          section={sec}
                          onChange={(s) => updateSection(idx, s)}
                          locked={locked}
                          tool={activeTool}
                          colorFor={colorFor}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add section buttons */}
            {!locked && (
              <div className="flex flex-wrap gap-2 mt-4">
                {allowedKinds.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addSection(kind)}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-900 bg-[#FFF9EB] hover:bg-amber-100/70 border border-amber-200/80 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> <KindIcon kind={kind} className="w-3.5 h-3.5" /> {KIND_LABELS[kind].title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-slate-900">Capacity summary</span>
              <span className="text-[13px] font-semibold text-amber-700">{totalCapacity} total</span>
            </div>
            <ul className="space-y-1">
              {tierNames.map((n) => {
                const cap = caps.get(n.toLowerCase());
                return (
                  <li key={n} className="flex items-center justify-between text-[13px] font-semibold">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span className={`w-3 h-3 rounded-sm ${colorFor(n).swatch}`} />
                      {n}
                    </span>
                    {cap !== undefined ? (
                      <span className="text-slate-900 font-semibold">{cap} tickets</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="w-3 h-3" /> Not on the map — sold by quantity
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1">Seat colour = its ticket category</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-300 ring-2 ring-slate-500 text-[8px] leading-3 text-center">♿</span> Wheelchair space</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-dashed border-slate-500" /> Blocked / aisle</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
