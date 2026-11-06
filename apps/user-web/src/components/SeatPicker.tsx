"use client";

import React, { useMemo } from "react";
import { Check } from "lucide-react";

/**
 * Builds a lookup that answers "is seat <section, row, number> taken?" from the backend's seat list.
 *
 * The backend lists a sectioned seat under several keys ("Front:A-1", "Front-A-1" and plain "A-1"),
 * and an unsectioned seat only as "A-1". So a plain "A-1" only blocks every section when no
 * sectioned entry for A-1 exists; otherwise "Front:A-1" being booked would wrongly block "Back:A-1".
 */
function buildSeatLookup(keys: string[]) {
  const set = new Set(keys);
  const sectionedPlainKeys = new Set<string>();
  for (const k of keys) {
    const colon = k.indexOf(":");
    if (colon !== -1) sectionedPlainKeys.add(k.slice(colon + 1));
  }
  return (section: string, row: string, num: number) => {
    const plain = `${row}-${num}`;
    if (set.has(`${section}:${plain}`) || set.has(`${section}-${plain}`)) return true;
    return set.has(plain) && !sectionedPlainKeys.has(plain);
  };
}

/** "Club:T3-2" -> "Table 3 · Seat 2", "Stalls:A-4" -> "A4". */
export function formatSeatLabel(key: string): string {
  const plain = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
  const dash = plain.lastIndexOf("-");
  if (dash === -1) return plain;
  const row = plain.slice(0, dash);
  const num = plain.slice(dash + 1);
  return /^T[0-9]+$/.test(row) ? `Table ${row.slice(1)} · Seat ${num}` : `${row}${num}`;
}

export interface SeatingSection {
  id?: string;
  name: string;
  tierName?: string;
  /** "ROWS" (default), "TABLES" (rows are tables T1, T2…) or "STANDING" (no seats; sold by quantity). */
  kind?: "ROWS" | "TABLES" | "STANDING";
  rows: string[];
  seatsPerRow: number;
  /** Seats not for sale (aisles, pillars…), e.g. ["A-5"]. Rendered as gaps. */
  blocked?: string[];
  /** Wheelchair spaces, e.g. ["A-1"]. */
  accessible?: string[];
  /** Per-seat ticket category overrides, e.g. { "A-5": "VIP" }. Other seats use `tierName`. */
  seatTiers?: Record<string, string>;
}

/** Ticket category names (lower-cased) used by numbered seats in a seat map, including per-seat overrides. */
export function seatedTierNamesOf(config: SeatingConfig | null | undefined): Set<string> {
  const names = new Set<string>();
  for (const s of config?.sections || []) {
    if ((s.kind || "ROWS") === "STANDING") continue;
    const overrides = s.seatTiers || {};
    const sellable = (s.rows?.length || 0) * (s.seatsPerRow || 0) - (s.blocked?.length || 0);
    if (sellable > Object.keys(overrides).length) names.add((s.tierName || "").trim().toLowerCase());
    for (const t of Object.values(overrides)) names.add(String(t).trim().toLowerCase());
  }
  names.delete("");
  return names;
}

export interface SeatingConfig {
  version?: number;
  stageLabel?: string;
  sections: SeatingSection[];
}

interface SeatPickerProps {
  config: SeatingConfig;
  ticketTypes: Array<{
    id: string;
    name: string;
    priceCents: number;
    available: number;
  }>;
  selectedSeats: string[]; // e.g. ["A-1", "A-2"] or ["Front Section:A-1"]
  onToggleSeat: (seatKey: string, tierId: string) => void;
  bookedSeats?: string[];
  heldSeats?: string[];
  maxSeats?: number;
  disabled?: boolean;
}

export default function SeatPicker({
  config,
  ticketTypes,
  selectedSeats,
  onToggleSeat,
  bookedSeats = [],
  heldSeats = [],
  maxSeats = 10,
  disabled = false
}: SeatPickerProps) {
  const isBookedSeat = useMemo(() => buildSeatLookup(bookedSeats), [bookedSeats]);
  const isHeldSeat = useMemo(() => buildSeatLookup(heldSeats), [heldSeats]);

  const seatSections = (config?.sections || []).filter((s) => (s.kind || "ROWS") !== "STANDING");
  if (seatSections.length === 0) {
    return null;
  }
  // Legend: only categories that are actually on the seat map
  const seatedTierNames = seatedTierNamesOf(config);
  const legendTiers = config.version === 2
    ? ticketTypes.filter((t) => seatedTierNames.has(t.name.trim().toLowerCase()))
    : ticketTypes;

  const tierColors = [
    "border-amber-400/60 hover:bg-amber-400/15 hover:border-amber-400 text-slate-300", // Gold/VIP
    "border-cyan-400/60 hover:bg-cyan-400/15 hover:border-cyan-400 text-slate-300", // Cyan/Premium
    "border-purple-400/60 hover:bg-purple-400/15 hover:border-purple-400 text-slate-300", // Purple/Standard
    "border-emerald-400/60 hover:bg-emerald-400/15 hover:border-emerald-400 text-slate-300", // Green/Economy
  ];

  // Find a ticket category by name (falls back to the first category)
  const getTierInfo = (tierName?: string) => {
    let index = 0;
    if (tierName) {
      const matchIndex = ticketTypes.findIndex(
        (t) => t.name.trim().toLowerCase() === tierName.trim().toLowerCase()
      );
      if (matchIndex !== -1) index = matchIndex;
    }
    const tier = ticketTypes[index] || ticketTypes[0];
    const colorClass = tierColors[index % tierColors.length];
    return { tier, colorClass };
  };
  const formatPrice = (cents: number) => `$${(cents / 100).toLocaleString('en-AU')}`;

  return (
    <div className="w-full bg-slate-900 text-white rounded-2xl p-3 sm:p-6 md:p-8 shadow-xl border border-slate-800">
      {/* Stage Screen Bar */}
      <div className="flex flex-col items-center justify-center mb-6 sm:mb-10">
        <div className="w-3/4 max-w-md h-2 bg-linear-to-r from-transparent via-amber-400 to-transparent rounded-full mb-2 shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {config.stageLabel || "Stage / Screen"}
        </span>
      </div>

      {/* Dynamic Tier Legend */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 mt-2">
        {legendTiers.map((tier) => {
          const idx = Math.max(0, ticketTypes.findIndex((t) => t.id === tier.id));
          const colorClass = tierColors[idx % tierColors.length];
          // Extract just the border color for the legend swatch
          const borderColor = colorClass.split(' ')[0];
          
          return (
            <div key={tier.id || idx} className="flex items-center gap-2 bg-slate-800/40 px-2.5 py-1.5 rounded-xl border border-slate-700/50">
              <div className={`w-3.5 h-3.5 rounded bg-slate-800 border-[1.5px] ${borderColor}`} />
              <div className="flex flex-col text-left">
                <span className="text-slate-200 text-[10px] sm:text-[11px] font-bold leading-tight">{tier.name}</span>
                <span className="text-slate-400 text-[9px] sm:text-[10px] font-medium leading-none">${(tier.priceCents / 100).toLocaleString('en-AU')}</span>
              </div>
            </div>
          );
        })}
        
        <div className="w-px h-6 bg-slate-700/50 mx-1 hidden sm:block"></div>
        
        <div className="flex items-center gap-2 bg-slate-800/40 px-2.5 py-1.5 rounded-xl border border-slate-700/50">
          <div className="w-3.5 h-3.5 rounded bg-amber-400 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-slate-950 font-black stroke-3" />
          </div>
          <span className="text-amber-400 text-[10px] sm:text-[11px] font-bold">Selected</span>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-800/40 px-2.5 py-1.5 rounded-xl border border-slate-700/50 opacity-70">
          <div className="w-3.5 h-3.5 rounded bg-slate-800/80 border border-slate-700 flex items-center justify-center">
            <span className="text-[10px] text-slate-500 font-black leading-none mb-0.5">×</span>
          </div>
          <span className="text-slate-500 text-[10px] sm:text-[11px] font-bold">Booked</span>
        </div>

        {seatSections.some((s) => (s.accessible || []).length > 0) && (
          <div className="flex items-center gap-2 bg-slate-800/40 px-2.5 py-1.5 rounded-xl border border-slate-700/50">
            <div className="w-3.5 h-3.5 rounded bg-sky-500/80 flex items-center justify-center text-[8px] leading-none">♿</div>
            <span className="text-sky-300 text-[10px] sm:text-[11px] font-bold">Wheelchair space</span>
          </div>
        )}
      </div>

      {/* Mobile Swipe Hint */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-400/90 sm:hidden mb-4 bg-slate-800/60 py-1.5 px-3 rounded-full border border-slate-700/50 w-fit mx-auto shadow-2xs">
        <span>↔ Swipe horizontally to view all seats</span>
      </div>

      {/* Seating Sections */}
      <div className="space-y-12 sm:space-y-16 overflow-x-auto pb-6 pt-4 px-2 sm:px-4 touch-pan-x">
        {seatSections.map((section, sIdx) => {
          const blocked = new Set(section.blocked || []);
          const accessible = new Set(section.accessible || []);
          const isTables = section.kind === "TABLES";
          // Section header shows a price, or a range when seats in it have different categories
          const sectionTierNames = new Set([section.tierName || "", ...Object.values(section.seatTiers || {})]);
          const sectionPrices = Array.from(sectionTierNames)
            .map((n) => getTierInfo(n).tier?.priceCents)
            .filter((c): c is number => typeof c === "number");
          const minPrice = sectionPrices.length ? Math.min(...sectionPrices) : null;
          const maxPrice = sectionPrices.length ? Math.max(...sectionPrices) : null;
          const sectionPriceDisplay =
            minPrice === null ? '' : minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)}–${formatPrice(maxPrice!)}`;

          const renderSeat = (rowName: string, seatNum: number, style?: React.CSSProperties) => {
            const plain = `${rowName}-${seatNum}`;
            const { tier, colorClass } = getTierInfo(section.seatTiers?.[plain] || section.tierName);
            const priceDisplay = tier ? formatPrice(tier.priceCents) : '';
            const seatKey = `${section.name}:${plain}`;
            const isSelected = selectedSeats.includes(seatKey);
            const isBooked = isBookedSeat(section.name, rowName, seatNum);
            const isHeld = !isBooked && isHeldSeat(section.name, rowName, seatNum);
            const isUnavailable = isBooked || isHeld;
            const isAccessible = accessible.has(plain);
            const seatLabel = isTables ? String(seatNum) : `${rowName}${seatNum}`;
            const fullLabel = isTables ? `Table ${rowName.replace(/^T/, "")} · Seat ${seatNum}` : `${rowName}${seatNum}`;

            return (
              <button
                key={plain}
                type="button"
                aria-label={`${section.name} ${fullLabel}${isAccessible ? " (wheelchair space)" : ""}`}
                aria-disabled={isUnavailable || disabled}
                onClick={() => {
                  if (isUnavailable || disabled) return;
                  const targetTierId = tier?.id || ticketTypes?.[0]?.id || "";
                  onToggleSeat(seatKey, targetTierId);
                }}
                style={style}
                className={`group relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[9px] sm:text-[10px] font-black transition-all flex items-center justify-center select-none tracking-tighter ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 font-black scale-105 shadow-[0_0_10px_rgba(251,191,36,0.5)] ring-2 ring-amber-300 cursor-pointer"
                    : disabled
                    ? "bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed opacity-30"
                    : isUnavailable
                    ? "bg-slate-800/60 border border-slate-800 text-slate-600 cursor-not-allowed opacity-40 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500 hover:opacity-100"
                    : isAccessible
                    ? "bg-sky-500/25 border border-sky-400 text-sky-100 hover:scale-105 cursor-pointer"
                    : `bg-slate-800 border ${colorClass} hover:scale-105 cursor-pointer`
                }`}
              >
                {isAccessible && !isSelected ? "♿" : seatLabel}

                {/* Premium Tooltip */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 text-white px-3 py-1.5 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex flex-col items-center min-w-max">
                  <span className="font-bold text-[11px] mb-0.5">{fullLabel} <span className="text-slate-400 font-normal ml-1">({tier?.name || section.name})</span></span>
                  <span className={`text-[10px] font-bold ${isUnavailable ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isBooked ? 'Already Booked' : isHeld ? 'Temporarily Held' : `${priceDisplay}${isAccessible ? ' · Wheelchair space' : ''}`}
                  </span>
                </div>
              </button>
            );
          };

          return (
            <div key={section.id || sIdx} className="min-w-fit mx-auto text-center">
              {/* Section Header */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-bold mb-5">
                <span className="text-slate-200">{section.name}</span>
                {sectionPriceDisplay && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-amber-400 font-black">{sectionPriceDisplay}</span>
                  </>
                )}
              </div>

              {isTables ? (
                /* Tables: chairs arranged around each round table */
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 max-w-3xl mx-auto">
                  {section.rows.map((tableName) => {
                    const chairs = section.seatsPerRow;
                    const radius = 46;
                    return (
                      <div key={tableName} className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
                        <div className="absolute inset-8 sm:inset-9 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center text-[11px] font-black text-slate-200">
                          {tableName.replace(/^T/, "Table ")}
                        </div>
                        {Array.from({ length: chairs }, (_, i) => {
                          const seatNum = i + 1;
                          if (blocked.has(`${tableName}-${seatNum}`)) return null;
                          const angle = (2 * Math.PI * i) / chairs - Math.PI / 2;
                          return renderSeat(tableName, seatNum, {
                            position: "absolute",
                            left: `calc(50% + ${Math.cos(angle) * radius}px - 14px)`,
                            top: `calc(50% + ${Math.sin(angle) * radius}px - 14px)`,
                          });
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Rows */
                <div className="flex flex-col gap-2.5 items-center">
                  {section.rows.map((rowName) => (
                    <div key={rowName} className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-black text-slate-400">{rowName}</span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {Array.from({ length: section.seatsPerRow }, (_, i) => {
                          const seatNum = i + 1;
                          // Theater curve (parabola)
                          const centerIndex = (section.seatsPerRow - 1) / 2;
                          const distanceFromCenter = Math.abs(i - centerIndex);
                          const curveOffset = distanceFromCenter * distanceFromCenter * 0.8;
                          if (blocked.has(`${rowName}-${seatNum}`)) {
                            // Blocked seats (aisles, pillars) leave a gap
                            return <span key={seatNum} aria-hidden="true" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />;
                          }
                          return renderSeat(rowName, seatNum, { marginTop: `${curveOffset}px` });
                        })}
                      </div>
                      <span className="w-6 text-center text-xs font-black text-slate-400">{rowName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Seats summary inside picker */}
      {selectedSeats.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-slate-400 block">Selected Seats ({selectedSeats.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedSeats.map((key) => {
                const label = formatSeatLabel(key);
                return (
                  <span
                    key={key}
                    className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Maximum {maxSeats} seats per booking
          </span>
        </div>
      )}
    </div>
  );
}
