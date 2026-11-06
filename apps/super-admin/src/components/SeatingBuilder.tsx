"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Sparkles,
  Lock,
  Accessibility,
  Ban,
  Users,
  Armchair,
  UtensilsCrossed,
  Layers,
  Undo2,
  X,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
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
  toggleAccessible,
  toggleBlocked,
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
const MAX_UNDO = 30;

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:bg-slate-50 disabled:text-slate-500";
const labelCls = "block text-[13px] font-medium text-slate-600 mb-1";

function KindIcon({ kind, className = "w-4 h-4" }: { kind: SectionKind; className?: string }) {
  if (kind === "STANDING") return <Users className={className} />;
  if (kind === "TABLES") return <UtensilsCrossed className={className} />;
  return <Armchair className={className} />;
}

function ModeIcon({ mode, className }: { mode: SeatingMode; className?: string }) {
  if (mode === "GENERAL") return <Users className={className} />;
  if (mode === "TABLES") return <UtensilsCrossed className={className} />;
  if (mode === "MIXED") return <Layers className={className} />;
  return <Armchair className={className} />;
}

function clampInt(value: string, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** All seat keys ("A-1") of a section, row by row. */
function allKeys(section: SeatSection): string[] {
  const keys: string[] = [];
  const per = seatsPerRowOf(section);
  for (const r of sectionRows(section)) for (let n = 1; n <= per; n++) keys.push(`${r}-${n}`);
  return keys;
}

/** One seat. Tapping only selects it; nothing changes until an action is chosen. */
function SeatDot({
  label,
  mark,
  colorCls,
  selected,
  onToggle,
  disabled,
  title,
}: {
  label: string;
  mark: "normal" | "accessible" | "blocked";
  colorCls: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  title: string;
}) {
  const base =
    mark === "blocked" ? "border border-dashed border-slate-500 bg-transparent text-slate-500" : colorCls;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={title}
      aria-pressed={selected}
      className={`w-6 h-6 shrink-0 rounded-md text-[10px] font-semibold flex items-center justify-center select-none ${base} ${
        selected ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950" : mark === "accessible" ? "ring-1 ring-white/70" : ""
      } ${disabled ? "cursor-default" : "cursor-pointer hover:brightness-110"}`}
    >
      {mark === "accessible" ? "♿" : mark === "blocked" ? "×" : label}
    </button>
  );
}

function SeatMap({
  section,
  selected,
  onToggleSeat,
  onToggleRow,
  locked,
  colorFor,
}: {
  section: SeatSection;
  selected: Set<string>;
  onToggleSeat: (key: string) => void;
  onToggleRow: (row: string) => void;
  locked?: boolean;
  colorFor: (tierName: string) => { seat: string; swatch: string };
}) {
  const s = cleanMarks(section);
  const rows = sectionRows(s);
  const perRow = seatsPerRowOf(s);
  const isTables = s.kind === "TABLES";

  const title = (key: string) => {
    const mark = markOf(s, key);
    const place = isTables ? key.replace(/^T(\d+)-/, "Table $1, chair ") : key.replace("-", "");
    const what = mark === "blocked" ? "not for sale" : `${tierOfSeat(s, key)}${mark === "accessible" ? ", wheelchair space" : ""}`;
    return locked ? `${place}: ${what}` : `${place}: ${what} — tap to select`;
  };
  const dot = (key: string, label: string) => (
    <SeatDot
      key={key}
      label={label}
      mark={markOf(s, key)}
      colorCls={colorFor(tierOfSeat(s, key)).seat}
      selected={selected.has(key)}
      onToggle={() => !locked && onToggleSeat(key)}
      disabled={locked}
      title={title(key)}
    />
  );
  const rowButton = (row: string, children: React.ReactNode, className: string) => (
    <button
      type="button"
      disabled={locked}
      onClick={() => onToggleRow(row)}
      title={locked ? undefined : `Select all of ${isTables ? row.replace("T", "table ") : `row ${row}`}`}
      className={`${className} ${locked ? "cursor-default" : "cursor-pointer hover:text-white hover:border-white"}`}
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
                "absolute inset-7 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-[11px] font-semibold text-slate-200"
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
          <div className="space-y-1.5 w-fit mx-auto">
            {rows.slice(0, MAX_PREVIEW_ROWS).map((r) => (
              <div key={r} className="flex items-center gap-1.5">
                {rowButton(r, r, "w-7 shrink-0 text-right pr-1.5 text-xs font-semibold text-slate-400")}
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
  // Selected seats per section id
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  // Previous seat layouts, for Undo
  const [history, setHistory] = useState<SeatSection[][]>([]);

  const allowedKinds = kindsForMode(mode);
  const tierNames = tiers.map((t) => String(t.name || "").trim());
  const namedTiers = tierNames.map((name, index) => ({ name, index })).filter((t) => t.name);
  const caps = capacityByTier(sections);
  const totalCapacity = sections.reduce((sum, s) => sum + sectionCapacity(s), 0);

  const colorFor = (tierName: string) => {
    const idx = tierNames.findIndex((n) => n && n.toLowerCase() === tierName.trim().toLowerCase());
    return idx === -1 ? UNKNOWN_COLOR : TIER_COLORS[idx % TIER_COLORS.length];
  };

  /** Applies a layout change and remembers the previous layout so it can be undone. */
  const commit = (next: SeatSection[]) => {
    setHistory((h) => [...h.slice(-(MAX_UNDO - 1)), sections]);
    onSectionsChange(next);
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setSelection({});
    onSectionsChange(prev);
  };

  const updateSection = (idx: number, next: SeatSection) => {
    const copy = [...sections];
    copy[idx] = cleanMarks(next);
    commit(copy);
  };

  // ---- selection ----
  const selectedIn = (sec: SeatSection) => new Set(selection[sec.id] || []);
  const setSelected = (sec: SeatSection, keys: Set<string>) => setSelection((prev) => ({ ...prev, [sec.id]: Array.from(keys) }));
  // Functional updates so quick successive taps never overwrite each other
  const toggleSeat = (sec: SeatSection, key: string) =>
    setSelection((prev) => {
      const set = new Set(prev[sec.id] || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, [sec.id]: Array.from(set) };
    });
  const toggleRow = (sec: SeatSection, row: string) =>
    setSelection((prev) => {
      const set = new Set(prev[sec.id] || []);
      const rowKeys = Array.from({ length: seatsPerRowOf(sec) }, (_, i) => `${row}-${i + 1}`);
      const allIn = rowKeys.every((k) => set.has(k));
      for (const k of rowKeys) {
        if (allIn) set.delete(k);
        else set.add(k);
      }
      return { ...prev, [sec.id]: Array.from(set) };
    });

  // ---- actions on the selected seats ----
  const applyToSelection = (idx: number, change: (s: SeatSection, keys: string[]) => SeatSection) => {
    const sec = sections[idx];
    const keys = selection[sec.id] || [];
    if (keys.length === 0) return;
    updateSection(idx, change(sec, keys));
    setSelected(sec, new Set());
  };
  const assignCategory = (idx: number, tier: string) =>
    applyToSelection(idx, (s, keys) => keys.reduce((acc, k) => paintSeat(acc, k, tier), s));
  const setWheelchair = (idx: number, on: boolean) =>
    applyToSelection(idx, (s, keys) =>
      keys.reduce((acc, k) => ((markOf(acc, k) === "accessible") === on ? acc : toggleAccessible(acc, k)), s)
    );
  const setNotForSale = (idx: number, on: boolean) =>
    applyToSelection(idx, (s, keys) => keys.reduce((acc, k) => ((markOf(acc, k) === "blocked") === on ? acc : toggleBlocked(acc, k)), s));
  /** Back to normal: the section's main category, sellable, no wheelchair marker. */
  const resetToNormal = (idx: number) =>
    applyToSelection(idx, (s, keys) => {
      const drop = new Set(keys);
      const seatTiers = { ...(s.seatTiers || {}) };
      for (const k of keys) delete seatTiers[k];
      return {
        ...s,
        seatTiers,
        blocked: (s.blocked || []).filter((k) => !drop.has(k)),
        accessible: (s.accessible || []).filter((k) => !drop.has(k)),
      };
    });

  // ---- sections / modes / templates ----
  const addSection = (kind: SectionKind) => {
    const base = kind === "STANDING" ? "Standing area" : kind === "TABLES" ? "Tables" : "Section";
    const taken = new Set(sections.map((s) => s.name.trim().toLowerCase()));
    let n = sections.filter((s) => s.kind === kind).length + 1;
    let name = `${base} ${n}`;
    while (taken.has(name.toLowerCase())) name = `${base} ${++n}`;
    commit([...sections, makeSection(kind, name, namedTiers[0]?.name || "", nextStartRow(sections))]);
  };

  const chooseMode = (m: SeatingMode) => {
    if (locked || m === mode) return;
    onModeChange(m);
    const allowed = kindsForMode(m);
    const kept = sections.filter((s) => allowed.includes(s.kind));
    if (m !== "GENERAL" && kept.length === 0) {
      const kind: SectionKind = m === "TABLES" ? "TABLES" : "ROWS";
      kept.push(makeSection(kind, kind === "TABLES" ? "Tables 1" : "Section 1", namedTiers[0]?.name || ""));
    }
    setSelection({});
    commit(m === "GENERAL" ? [] : kept);
  };

  const applyTemplate = (tpl: SeatingTemplate) => {
    if (locked) return;
    if (sections.length > 0 && !window.confirm(`Replace your current layout with “${tpl.title}”?`)) return;
    onApplyTemplate(tpl);
    setSelection({});
    commit(tpl.build());
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
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <ModeIcon mode={opt.id} className={`w-4 h-4 shrink-0 ${active ? "text-amber-600" : "text-slate-400"}`} />
                  {opt.title}
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

          {/* Step 1: categories and prices */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-slate-900">1. Ticket categories</p>
              <p className="text-[13px] text-slate-500">{totalCapacity} tickets in total</p>
            </div>
            <p className="text-[13px] text-slate-500 mb-3">Name and price for each category. New seats start in the first category.</p>

            <div className="space-y-2">
              {tiers.map((t, i) => {
                const count = caps.get(tierNames[i].toLowerCase()) || 0;
                const canRemove = !locked && tiers.length > 1 && !(t.sold && t.sold > 0) && t.removable !== false;
                return (
                  <div key={i} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-slate-200 p-2">
                    <span className={`w-5 h-5 rounded-md shrink-0 ${TIER_COLORS[i % TIER_COLORS.length].swatch}`} />
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => onTierChange(i, "name", e.target.value)}
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
                      onClick={() => canRemove && onRemoveTier(i)}
                      disabled={!canRemove}
                      title={
                        canRemove
                          ? "Delete category (its seats move to the first category)"
                          : t.sold
                            ? "Has sold tickets"
                            : t.removable === false
                              ? "Saved categories can't be deleted here — move their seats to another category"
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
              <button
                type="button"
                onClick={() => onAddTier("New category")}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-[13px] text-slate-700 hover:border-amber-400 hover:text-amber-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add category
              </button>
            )}
          </div>

          {/* Step 2: seat map */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">2. Seat map</p>
              {!locked && (
                <p className="text-[13px] text-slate-500">
                  Tap seats to select them (tap a row letter to select the whole row), then choose what they should be.
                </p>
              )}
            </div>
            {!locked && (
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 hover:border-slate-300 cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                <Undo2 className="w-3.5 h-3.5" /> Undo
              </button>
            )}
          </div>

          <div className="space-y-4">
            {sections.map((sec, idx) => {
              const rows = sectionRows(sec);
              const capacity = sectionCapacity(sec);
              const selected = selectedIn(sec);
              const selectedKeys = Array.from(selected);
              const allWheelchair = selectedKeys.length > 0 && selectedKeys.every((k) => markOf(sec, k) === "accessible");
              const allBlocked = selectedKeys.length > 0 && selectedKeys.every((k) => markOf(sec, k) === "blocked");
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
                            {namedTiers.map((t) => (
                              <option key={t.index} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {!locked && sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => commit(sections.filter((_, i) => i !== idx))}
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
                        {!locked && (
                          <span className="flex items-center gap-2">
                            <button type="button" onClick={() => setSelected(sec, new Set(allKeys(sec)))} className="text-slate-700 hover:underline cursor-pointer">
                              Select all
                            </button>
                            {selected.size > 0 && (
                              <button type="button" onClick={() => setSelected(sec, new Set())} className="text-slate-700 hover:underline cursor-pointer">
                                Clear selection
                              </button>
                            )}
                          </span>
                        )}
                      </div>

                      <SeatMap
                        section={sec}
                        selected={selected}
                        onToggleSeat={(k) => toggleSeat(sec, k)}
                        onToggleRow={(r) => toggleRow(sec, r)}
                        locked={locked}
                        colorFor={colorFor}
                      />

                      {/* Legend */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {namedTiers.map((t) => (
                          <span key={t.index} className="inline-flex items-center gap-1.5">
                            <span className={`w-3 h-3 rounded-sm ${TIER_COLORS[t.index % TIER_COLORS.length].swatch}`} /> {t.name}
                          </span>
                        ))}
                        <span className="inline-flex items-center gap-1.5">♿ Wheelchair</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm border border-dashed border-slate-400" /> Not for sale
                        </span>
                      </div>

                      {/* Action bar for the selected seats */}
                      {!locked && selected.size > 0 && (
                        <div className="sticky bottom-3 z-10 rounded-xl border border-slate-900 bg-slate-900 text-white p-3 shadow-lg">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold mr-1">
                              <CheckCircle2 className="w-4 h-4 text-amber-400" />
                              {selected.size} {selected.size === 1 ? "seat" : "seats"} selected — make {selected.size === 1 ? "it" : "them"}:
                            </span>
                            {namedTiers.map((t) => (
                              <button
                                key={t.index}
                                type="button"
                                onClick={() => assignCategory(idx, t.name)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-900 text-[13px] font-medium hover:bg-slate-100 cursor-pointer"
                              >
                                <span className={`w-3 h-3 rounded-sm ${TIER_COLORS[t.index % TIER_COLORS.length].swatch}`} /> {t.name}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setWheelchair(idx, !allWheelchair)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/30 text-[13px] hover:bg-white/10 cursor-pointer"
                            >
                              <Accessibility className="w-3.5 h-3.5" /> {allWheelchair ? "Remove wheelchair" : "Wheelchair space"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setNotForSale(idx, !allBlocked)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/30 text-[13px] hover:bg-white/10 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" /> {allBlocked ? "Make sellable again" : "Not for sale"}
                            </button>
                            <button
                              type="button"
                              onClick={() => resetToNormal(idx)}
                              title={`Make the selected seats normal ${sec.tierName || "seats"} again (removes VIP / wheelchair / not for sale)`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-slate-900 text-[13px] font-semibold hover:bg-amber-300 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Reset to normal{sec.tierName ? ` (${sec.tierName})` : ""}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelected(sec, new Set())}
                              className="ml-auto inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[13px] text-white/80 hover:text-white cursor-pointer"
                              title="Clear selection"
                            >
                              <X className="w-4 h-4" /> Cancel
                            </button>
                          </div>
                        </div>
                      )}
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
