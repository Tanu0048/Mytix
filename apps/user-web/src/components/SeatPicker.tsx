"use client";

import React, { useState, useEffect } from "react";
import { Check, ShieldAlert, Clock } from "lucide-react";

export interface SeatingSection {
  id?: string;
  name: string;
  tierName?: string;
  rows: string[];
  seatsPerRow: number;
}

export interface SeatingConfig {
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
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer

  useEffect(() => {
    if (selectedSeats.length === 0) {
      setTimeLeft(300);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedSeats.length]);

  if (!config || !config.sections || config.sections.length === 0) {
    return null;
  }

  const tierColors = [
    "border-amber-400/60 hover:bg-amber-400/15 hover:border-amber-400 text-slate-300", // Gold/VIP
    "border-cyan-400/60 hover:bg-cyan-400/15 hover:border-cyan-400 text-slate-300", // Cyan/Premium
    "border-purple-400/60 hover:bg-purple-400/15 hover:border-purple-400 text-slate-300", // Purple/Standard
    "border-emerald-400/60 hover:bg-emerald-400/15 hover:border-emerald-400 text-slate-300", // Green/Economy
  ];

  // Find tier by name fallback to first tier
  const getTierInfoForSection = (section: SeatingSection) => {
    let index = 0;
    if (section.tierName) {
      const matchIndex = ticketTypes.findIndex(
        (t) => t.name.toLowerCase() === section.tierName?.toLowerCase()
      );
      if (matchIndex !== -1) index = matchIndex;
    }
    const tier = ticketTypes[index] || ticketTypes[0];
    const colorClass = tierColors[index % tierColors.length];
    return { tier, colorClass };
  };

  return (
    <div className="w-full bg-slate-900 text-white rounded-2xl p-3 sm:p-6 md:p-8 shadow-xl border border-slate-800">
      {/* Stage Screen Bar */}
      <div className="flex flex-col items-center justify-center mb-6 sm:mb-10">
        <div className="w-3/4 max-w-md h-2 bg-linear-to-r from-transparent via-amber-400 to-transparent rounded-full mb-2 shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Stage / Screen
        </span>
      </div>

      {/* Dynamic Tier Legend */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 mt-2">
        {ticketTypes.map((tier, idx) => {
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
      </div>

      {/* Mobile Swipe Hint */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-400/90 sm:hidden mb-4 bg-slate-800/60 py-1.5 px-3 rounded-full border border-slate-700/50 w-fit mx-auto shadow-2xs">
        <span>↔ Swipe horizontally to view all seats</span>
      </div>

      {/* Seating Sections */}
      <div className="space-y-12 sm:space-y-16 overflow-x-auto pb-6 pt-4 px-2 sm:px-4 touch-pan-x">
        {config.sections.map((section, sIdx) => {
          const { tier, colorClass } = getTierInfoForSection(section);
          const priceDisplay = tier ? `$${(tier.priceCents / 100).toLocaleString('en-AU')}` : '';

          return (
            <div key={section.id || sIdx} className="min-w-fit mx-auto text-center">
              {/* Section Header */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-bold mb-5">
                <span className="text-slate-200">{section.name}</span>
                {tier && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-amber-400 font-black">{priceDisplay}</span>
                  </>
                )}
              </div>

              {/* Rows */}
              <div className="flex flex-col gap-2.5 items-center">
                {section.rows.map((rowName) => (
                  <div key={rowName} className="flex items-center gap-3">
                    {/* Row Left Label */}
                    <span className="w-6 text-center text-xs font-black text-slate-400">
                      {rowName}
                    </span>

                    {/* Seats */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {Array.from({ length: section.seatsPerRow }, (_, i) => {
                        const seatNum = i + 1;
                        const seatKey = `${section.name}:${rowName}-${seatNum}`;
                        const simpleKey = `${rowName}-${seatNum}`;

                        const isSelected = selectedSeats.includes(seatKey) || selectedSeats.includes(simpleKey);
                        const isBooked = bookedSeats.some(
                          (s) => s === seatKey || s === simpleKey || s === `${rowName}-${seatNum}` || s.endsWith(`:${rowName}-${seatNum}`) || s.endsWith(`-${rowName}-${seatNum}`)
                        );
                        const isHeld = heldSeats.some(
                          (s) => s === seatKey || s === simpleKey || s === `${rowName}-${seatNum}` || s.endsWith(`:${rowName}-${seatNum}`) || s.endsWith(`-${rowName}-${seatNum}`)
                        );
                        const isUnavailable = isBooked || isHeld;
                        const seatLabel = `${rowName}${seatNum}`;
                        
                        // Calculate theater curve (parabola)
                        const centerIndex = (section.seatsPerRow - 1) / 2;
                        const distanceFromCenter = Math.abs(i - centerIndex);
                        const curveOffset = distanceFromCenter * distanceFromCenter * 0.8; // 0.8 is the curve steepness multiplier

                        return (
                          <button
                            key={seatNum}
                            type="button"
                            aria-disabled={isUnavailable || disabled}
                            onClick={() => {
                              if (isUnavailable || disabled) return;
                              tier && onToggleSeat(seatKey, tier.id);
                            }}
                            style={{ marginTop: `${curveOffset}px` }}
                            className={`group relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[9px] sm:text-[10px] font-black transition-all flex items-center justify-center select-none tracking-tighter ${
                              isSelected
                                ? "bg-amber-400 text-slate-950 font-black scale-105 shadow-[0_0_10px_rgba(251,191,36,0.5)] ring-2 ring-amber-300 cursor-pointer"
                                : disabled
                                ? "bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed opacity-30"
                                : isUnavailable
                                ? "bg-slate-800/60 border border-slate-800 text-slate-600 cursor-not-allowed opacity-40 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500 hover:opacity-100"
                                : `bg-slate-800 border ${colorClass} hover:scale-105 cursor-pointer`
                            }`}
                          >
                            {seatLabel}
                            
                            {/* Premium Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 text-white px-3 py-1.5 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex flex-col items-center min-w-max">
                              <span className="font-bold text-[11px] mb-0.5">{seatLabel} <span className="text-slate-400 font-normal ml-1">({tier?.name || section.name})</span></span>
                              <span className={`text-[10px] font-bold ${isUnavailable ? 'text-red-400' : 'text-emerald-400'}`}>
                                {isBooked ? 'Already Booked' : isHeld ? 'Temporarily Held' : priceDisplay}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Row Right Label */}
                    <span className="w-6 text-center text-xs font-black text-slate-400">
                      {rowName}
                    </span>
                  </div>
                ))}
              </div>
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
              <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedSeats.map((key) => {
                const label = key.includes(":") ? key.split(":")[1] : key;
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
