"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles, Lock, Accessibility, Ban, Users, Armchair, UtensilsCrossed, PaintBucket } from "lucide-react";
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
  cleanMarks,
  rowLabel,
  rowIndex,
  tierOfSeat,
  paintSeat,
  setRowTier,
  toggleAccessible,
  toggleBlocked,
  fillSection,
} from "@/lib/seating";

export interface BuilderTier {
  name: string;
  priceCents: number | string;
  /** Tickets already sold (edit page) — such categories can't be deleted. */
  sold?: number;
  /** Set to false for categories that can't be deleted here (e.g. already saved). */
  removable?: boolean;
}

interface SeatingBuilderProps {
  mode: SeatingMode;
  onModeChange: (mode: SeatingMode) => void;
  sections: SeatSection[];
  onSectionsChange: (sections: SeatSection[]) => void;
  /** Ticket categories, edited right here for seated events. */
  tiers: BuilderTier[];
  onTierChange: (index: number, field: "name" | "priceCents", value: string | number) => void;
  /** Creates a ticket category and returns its final (unique) name. */
  onAddTier: (suggestedName: string, priceCents?: number) => string;
  onRemoveTier: (index: number) => void;
  /** Called when a template is applied so the page can create the template's categories. */
  onApplyTemplate: (template: SeatingTemplate) => void;
  /** When true the seat layout can't change (e.g. tickets sold). Names and prices stay editable. */
  locked?: boolean;
  lockedReason?: string;
}

/** The brush: what tapping a seat does. A category is found by name, else by position (survives renames). */
type Brush = { type: "tier"; index: number; name?: string } | { type: "accessible" } | { type: "blocked" };

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
const UNKNOWN_COLOR = { seat: "bg-slate-600 text-slate-200", swatch: "bg-slate-600" };

const MAX_PREVIEW_ROWS = 40;
const MAX_PREVIEW_SEATS = 50;
const MAX_PREVIEW_TABLES = 80;

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:bg-slate-50 disabled:text-slate-500";
const labelCls = "block text-[13px] font-medium text-slate-600 mb-1";

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

/** One seat on the map. Pointer-down paints (so you can also drag across seats). */
function SeatDot({
  label,
  mark,
  colorCls,
  onPaint,
  disabled,
  title,
}: {
  label: string;
  mark: "normal" | "accessible" | "blocked";
  colorCls: string;
  onPaint: () => void;
  disabled?: boolean;
  title: string;
}) {
  const cls =
    mark === "blocked"
      ? "border border-dashed border-slate-500 bg-transparent text-slate-500"
      : `${colorCls} ${mark === "accessible" ? "ring-2 ring-white" : ""}`;
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        e.preventDefault();
        onPaint();
      }}
      onPointerEnter={(e) => {
        if (!disabled && e.buttons === 1) onPaint();
      }}
      onClick={(e) => {
        if (!disabled && e.detail === 0) onPaint(); // keyboard
      }}
      disabled={disabled}
      title={title}
      className={`w-6 h-6 shrink-0 rounded-md text-[10px] font-semibold flex items-center justify-center select-none transition-transform ${cls} ${
        disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
      }`}
    >
      {mark === "accessible" ? "♿" : mark === "blocked" ? "×" : label}
    </button>
  );
}

function SeatMap({
  section,
  onChange,
  locked,
  paint,
  paintRow,
  colorFor,
  brushLabel,
}: {
  section: SeatSection;
  onChange: (s: SeatSection) => void;
  locked?: boolean;
  paint: (s: SeatSection, key: string) => SeatSection;
  paintRow: ((s: SeatSection, row: string) => SeatSection) | null;
  colorFor: (tierName: string) => { seat: string; swatch: string };
  brushLabel: string;
}) {
  const s = cleanMarks(section);
  const rows = sectionRows(s);
  const perRow = seatsPerRowOf(s);
  const isTables = s.kind === "TABLES";

  const title = (key: string) => {
    const mark = markOf(s, key);
    const place = isTables ? key.replace(/^T(\d+)-/, "Table $1, chair ") : key.replace("-", "");
    const what = mark === "blocked" ? "not for sale" : `${tierOfSeat(s, key)}${mark === "accessible" ? ", wheelchair space" : ""}`;
    return locked ? `${place}: ${what}` : `${place}: ${what} — tap to apply “${brushLabel}”`;
  };
  const dot = (key: string, label: string) => (
    <SeatDot
      key={key}
      label={label}
      mark={markOf(s, key)}
      colorCls={colorFor(tierOfSeat(s, key)).seat}
      onPaint={() => !locked && onChange(paint(s, key))}
      disabled={locked}
      title={title(key)}
    />
  );
  const canPaintRow = !locked && !!paintRow;
  const rowButton = (row: string, children: React.ReactNode, className: string) => (
    <button
      type="button"
      disabled={!canPaintRow}
      onClick={() => paintRow && onChange(paintRow(s, row))}
      title={canPaintRow ? `Make all of ${isTables ? row.replace("T", "table ") : `row ${row}`} “${brushLabel}”` : undefined}
      className={`${className} ${canPaintRow ? "cursor-pointer hover:text-white hover:border-white" : "cursor-default"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-slate-950 rounded-lg px-3 py-4">
      <div className="mx-auto mb-4 w-2/3 max-w-sm">
        <div className="h-1.5 rounded-full bg-linear-to-r from-transparent via-amber-400 to-transparent" />
        <p className="text-center text-[11px] font-medium uppercase tracking-widest text-slate-500 mt-1">Stage</p>
      </div>
      {isTables ? (
        <div className="flex flex-wrap gap-4 justify-center">
          {rows.slice(0, MAX_PREVIEW_TABLES).map((t) => (
            <div key={t} className="relative w-28 h-28">
              {rowButton(
                t,
                t.replace("T", "Table "),
                "absolute inset-7 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-[11px] font-semibold text-slate-200 transition-colors"
              )}
              {Array.from({ length: perRow }, (_, i) => {
                const angle = (2 * Math.PI * i) / perRow - Math.PI / 2;
                return (
                  <div
                    key={i}
                    className="absolute"
                    style={{ left: `calc(50% + ${Math.cos(angle) * 44}px - 12px)`, top: `calc(50% + ${Math.sin(angle) * 44}px - 12px)` }}
                  >
                    {dot(`${t}-${i + 1}`, String(i + 1))}
                  </div>
                );
              })}
            </div>
          ))}
          {rows.length > MAX_PREVIEW_TABLES && (
            <p className="w-full text-center text-xs text-slate-500">+ {rows.length - MAX_PREVIEW_TABLES} more tables</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="space-y-1 w-fit mx-auto">
            {rows.slice(0, MAX_PREVIEW_ROWS).map((r) => (
              <div key={r} className="flex items-center gap-1">
                {rowButton(r, r, "w-7 shrink-0 text-right pr-1.5 text-xs font-semibold text-slate-400 transition-colors")}
                {Array.from({ length: Math.min(perRow, MAX_PREVIEW_SEATS) }, (_, i) => dot(`${r}-${i + 1}`, String(i + 1)))}
                {perRow > MAX_PREVIEW_SEATS && <span className="text-xs text-slate-500 ml-1">+{perRow - MAX_PREVIEW_SEATS}</span>}
              </div>
            ))}
            {rows.length > MAX_PREVIEW_ROWS && <p className="text-center text-xs text-slate-500">+ {rows.length - MAX_PREVIEW_ROWS} more rows</p>}
          </div>
        </div>
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
  onTierChange,
  onAddTier,
  onRemoveTier,
  onApplyTemplate,
  locked = false,
  lockedReason,
}: SeatingBuilderProps) {
  const [brush, setBrush] = useState<Brush>({ type: "tier", index: 0 });
  const allowedKinds = kindsForMode(mode);
  const tierNames = tiers.map((t) => String(t.name || "").trim());
  const caps = capacityByTier(sections);
  const totalCapacity = sections.reduce((sum, s) => sum + sectionCapacity(s), 0);
  const hasSeats = sections.some((s) => s.kind !== "STANDING");

  const colorFor = (tierName: string) => {
    const idx = tierNames.findIndex((n) => n && n.toLowerCase() === tierName.trim().toLowerCase());
    return idx === -1 ? UNKNOWN_COLOR : TIER_COLORS[idx % TIER_COLORS.length];
  };

  // Resolve the brush's category: by name first, else by position (keeps working while a name is retyped)
  const brushTierIndex =
    brush.type !== "tier"
      ? -1
      : (() => {
          const byName = brush.name ? tierNames.findIndex((n) => n.toLowerCase() === brush.name!.toLowerCase()) : -1;
          return byName !== -1 ? byName : Math.min(brush.index, tiers.length - 1);
        })();
  const brushTier = brushTierIndex >= 0 ? tierNames[brushTierIndex] : "";
  const brushLabel = brush.type === "accessible" ? "Wheelchair space" : brush.type === "blocked" ? "Not for sale" : brushTier || "category";

  const paint = (s: SeatSection, key: string): SeatSection => {
    if (brush.type === "accessible") return toggleAccessible(s, key);
    if (brush.type === "blocked") return toggleBlocked(s, key);
    return brushTier ? paintSeat(s, key, brushTier) : s;
  };
  const paintRow = brush.type === "tier" && brushTier ? (s: SeatSection, row: string) => setRowTier(s, row, brushTier) : null;

  const updateSection = (idx: number, next: SeatSection) => {
    const copy = [...sections];
    copy[idx] = cleanMarks(next);
    onSectionsChange(copy);
  };

  const addSection = (kind: SectionKind) => {
    const base = kind === "STANDING" ? "Standing area" : kind === "TABLES" ? "Tables" : "Section";
    const taken = new Set(sections.map((s) => s.name.trim().toLowerCase()));
    let n = sections.filter((s) => s.kind === kind).length + 1;
    let name = `${base} ${n}`;
    while (taken.has(name.toLowerCase())) name = `${base} ${++n}`;
    onSectionsChange([...sections, makeSection(kind, name, brushTier || tierNames[0] || "", nextStartRow(sections))]);
  };

  const chooseMode = (m: SeatingMode) => {
    if (locked || m === mode) return;
    onModeChange(m);
    const allowed = kindsForMode(m);
    const kept = sections.filter((s) => allowed.includes(s.kind));
    if (m !== "GENERAL" && kept.length === 0) {
      const kind: SectionKind = m === "TABLES" ? "TABLES" : "ROWS";
      kept.push(makeSection(kind, kind === "TABLES" ? "Tables 1" : "Section 1", tierNames[0] || ""));
    }
    onSectionsChange(m === "GENERAL" ? [] : kept);
  };

  const applyTemplate = (tpl: SeatingTemplate) => {
    if (locked) return;
    if (sections.length > 0 && !window.confirm(`Replace your current layout with “${tpl.title}”?`)) return;
    onApplyTemplate(tpl);
    onSectionsChange(tpl.build());
    setBrush({ type: "tier", index: 0, name: tpl.tiers[0]?.name });
  };

  const addCategory = () => {
    const name = onAddTier("New category");
    setBrush({ type: "tier", index: tiers.length, name });
  };

  return (
    <div className="space-y-6">
      {locked && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[13px]">
          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span>{lockedReason || "The seat layout is locked."}</span>
        </div>
      )}

      {/* How do people attend? */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-2">How will people attend?</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => chooseMode(opt.id)}
                disabled={locked && !active}
                title={`${opt.subtitle} e.g. ${opt.example}`}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  active ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400" : "border-slate-200 bg-white hover:border-slate-300 disabled:opacity-50"
                } ${locked ? "cursor-default" : "cursor-pointer"}`}
              >
                <span className="block text-sm font-semibold text-slate-900">
                  <span className="mr-1">{opt.emoji}</span> {opt.title}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{opt.example}</span>
              </button>
            );
          })}
        </div>
        {mode === "GENERAL" && (
          <p className="mt-3 text-[13px] text-slate-500">No seat map needed. Set your ticket categories, prices and ticket limits below.</p>
        )}
      </div>

      {mode !== "GENERAL" && (
        <>
          {/* Ready-made layouts */}
          {!locked && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium text-slate-600 mr-1">Quick start:</span>
              {TEMPLATES[mode].map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  title={tpl.description}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {tpl.title}
                </button>
              ))}
            </div>
          )}

          {/* Categories = the paint palette */}
          <div className="sticky top-16 z-10 rounded-xl border border-slate-200 bg-white/95 backdrop-blur p-4 shadow-xs">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-slate-900">Ticket categories</p>
              <p className="text-[13px] text-slate-500">{totalCapacity} tickets in total</p>
            </div>
            <p className="text-[13px] text-slate-500 mb-3">
              {locked ? "You can still change names and prices." : "Pick a category, then tap seats (or a row letter) to give them that category."}
            </p>

            <div className="space-y-2">
              {tiers.map((t, i) => {
                const active = !locked && brush.type === "tier" && brushTierIndex === i;
                const count = caps.get(tierNames[i].toLowerCase()) || 0;
                const canRemove = !locked && tiers.length > 1 && !(t.sold && t.sold > 0) && t.removable !== false;
                return (
                  <div
                    key={i}
                    onClick={() => !locked && setBrush({ type: "tier", index: i, name: tierNames[i] })}
                    className={`flex items-center gap-2 sm:gap-3 rounded-lg border p-2 transition-colors ${
                      active ? "border-slate-900 bg-slate-50" : "border-slate-200"
                    } ${locked ? "" : "cursor-pointer"}`}
                  >
                    <span className={`w-5 h-5 rounded-md shrink-0 ${TIER_COLORS[i % TIER_COLORS.length].swatch} ${active ? "ring-2 ring-slate-900 ring-offset-1" : ""}`} />
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => onTierChange(i, "name", e.target.value)}
                      onFocus={() => !locked && setBrush({ type: "tier", index: i, name: tierNames[i] })}
                      placeholder="Category name, e.g. VIP"
                      aria-label="Category name"
                      className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white py-1.5 px-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
                    />
                    <div className="relative w-24 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={Number(t.priceCents) / 100}
                        onChange={(e) => onTierChange(i, "priceCents", Math.round(Number(e.target.value || 0) * 100))}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Price"
                        className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-6 pr-2 text-sm text-slate-900 outline-none focus:border-amber-400"
                      />
                    </div>
                    <span className={`w-20 shrink-0 text-right text-[13px] ${count ? "text-slate-700" : "text-amber-700"}`}>
                      {count} {count === 1 ? "seat" : "seats"}
                    </span>
                    {t.sold ? <span className="hidden sm:inline text-xs text-slate-500 shrink-0">{t.sold} sold</span> : null}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canRemove) onRemoveTier(i);
                      }}
                      disabled={!canRemove}
                      title={
                        canRemove
                          ? "Delete category"
                          : t.sold
                            ? "Has sold tickets"
                            : t.removable === false
                              ? "Saved categories can't be deleted here — paint their seats with another category"
                              : undefined
                      }
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer disabled:cursor-default shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {!locked && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={addCategory}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-[13px] text-slate-700 hover:border-amber-400 hover:text-amber-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add category
                </button>
                {hasSeats && (
                  <>
                    <span className="text-[13px] text-slate-400 ml-1">Other tools:</span>
                    {([
                      { type: "accessible", label: "Wheelchair space", icon: <Accessibility className="w-3.5 h-3.5" /> },
                      { type: "blocked", label: "Not for sale", icon: <Ban className="w-3.5 h-3.5" /> },
                    ] as const).map((b) => (
                      <button
                        key={b.type}
                        type="button"
                        onClick={() => setBrush({ type: b.type })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] cursor-pointer ${
                          brush.type === b.type ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {b.icon} {b.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((sec, idx) => {
              const rows = sectionRows(sec);
              const capacity = sectionCapacity(sec);
              const tierMissing = !tierNames.some((n) => n && n.toLowerCase() === sec.tierName.trim().toLowerCase());
              return (
                <div key={sec.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-40">
                      <label className={labelCls}>
                        <KindIcon kind={sec.kind} className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-slate-400" />
                        {KIND_LABELS[sec.kind].title} — name
                      </label>
                      <input
                        type="text"
                        value={sec.name}
                        disabled={locked}
                        onChange={(e) => updateSection(idx, { ...sec, name: e.target.value.replace(/:/g, "") })}
                        className={inputCls}
                      />
                    </div>

                    {sec.kind === "ROWS" && (
                      <>
                        <div className="w-24">
                          <label className={labelCls}>Rows</label>
                          <input type="number" min={1} max={100} disabled={locked} value={sec.rowCount ?? 0}
                            onChange={(e) => updateSection(idx, { ...sec, rowCount: clampInt(e.target.value, 1, 100) })} className={inputCls} />
                        </div>
                        <div className="w-24">
                          <label className={labelCls}>First row</label>
                          <input type="text" maxLength={2} disabled={locked} value={sec.startRow ?? "A"}
                            onChange={(e) => {
                              const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                              updateSection(idx, { ...sec, startRow: v ? rowLabel(rowIndex(v)) : "A" });
                            }} className={inputCls} />
                        </div>
                        <div className="w-28">
                          <label className={labelCls}>Seats per row</label>
                          <input type="number" min={1} max={200} disabled={locked} value={sec.seatsPerRow ?? 0}
                            onChange={(e) => updateSection(idx, { ...sec, seatsPerRow: clampInt(e.target.value, 1, 200) })} className={inputCls} />
                        </div>
                      </>
                    )}

                    {sec.kind === "TABLES" && (
                      <>
                        <div className="w-24">
                          <label className={labelCls}>Tables</label>
                          <input type="number" min={1} max={300} disabled={locked} value={sec.tables ?? 0}
                            onChange={(e) => updateSection(idx, { ...sec, tables: clampInt(e.target.value, 1, 300) })} className={inputCls} />
                        </div>
                        <div className="w-28">
                          <label className={labelCls}>Chairs per table</label>
                          <input type="number" min={1} max={30} disabled={locked} value={sec.seatsPerTable ?? 0}
                            onChange={(e) => updateSection(idx, { ...sec, seatsPerTable: clampInt(e.target.value, 1, 30) })} className={inputCls} />
                        </div>
                      </>
                    )}

                    {sec.kind === "STANDING" && (
                      <>
                        <div className="w-32">
                          <label className={labelCls}>People allowed</label>
                          <input type="number" min={1} max={200000} disabled={locked} value={sec.capacity ?? 0}
                            onChange={(e) => updateSection(idx, { ...sec, capacity: clampInt(e.target.value, 1, 200000) })} className={inputCls} />
                        </div>
                        <div className="w-44">
                          <label className={labelCls}>Ticket category</label>
                          <select
                            value={tierMissing ? "" : tierNames.find((n) => n.toLowerCase() === sec.tierName.trim().toLowerCase())}
                            disabled={locked}
                            onChange={(e) => updateSection(idx, { ...sec, tierName: e.target.value })}
                            className={`${inputCls} ${tierMissing ? "border-red-300" : ""}`}
                          >
                            <option value="" disabled>Choose…</option>
                            {tierNames.filter(Boolean).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {!locked && sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onSectionsChange(sections.filter((_, i) => i !== idx))}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                        title="Remove section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {sec.kind !== "STANDING" && (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-500">
                        <span>
                          {capacity} seats
                          {sec.kind === "ROWS" && rows.length > 0 && ` · rows ${rows[0]}–${rows[rows.length - 1]}`}
                          {(sec.accessible?.length || 0) > 0 && ` · ${sec.accessible!.length} wheelchair`}
                          {(sec.blocked?.length || 0) > 0 && ` · ${sec.blocked!.length} not for sale`}
                        </span>
                        {!locked && brush.type === "tier" && brushTier && (
                          <button
                            type="button"
                            onClick={() => updateSection(idx, fillSection(sec, brushTier))}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer"
                          >
                            <PaintBucket className="w-3.5 h-3.5" /> Make whole section {brushTier}
                          </button>
                        )}
                      </div>
                      <SeatMap
                        section={sec}
                        onChange={(s) => updateSection(idx, s)}
                        locked={locked}
                        paint={paint}
                        paintRow={paintRow}
                        colorFor={colorFor}
                        brushLabel={brushLabel}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {!locked && (
            <div className="flex flex-wrap gap-2">
              {allowedKinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addSection(kind)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add {KIND_LABELS[kind].title.toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
