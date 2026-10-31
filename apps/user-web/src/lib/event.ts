/**
 * Shared helpers for presenting events consistently across pages.
 * Events come from the backend as loosely-typed JSON, so these accept `any`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Booking closes this long before the event starts. */
const BOOKING_CUTOFF_MS = 60 * 60 * 1000;

/** At or below this many seats, cards show an "Only N left" warning. */
export const LOW_STOCK_THRESHOLD = 10;

export interface EventStatus {
  startsAt: Date | null;
  available: number;
  total: number;
  /** Lowest non-zero ticket price in dollars, or 0 if none. */
  priceFrom: number;
  isFree: boolean;
  isClosed: boolean;
  isSoldOut: boolean;
  isLowStock: boolean;
  isBookable: boolean;
}

export function getEventStatus(event: any): EventStatus {
  const ticketTypes: any[] = Array.isArray(event?.ticketTypes) ? event.ticketTypes : [];
  const available = ticketTypes.reduce((acc, t) => acc + (t.available ?? 0), 0);
  const total = ticketTypes.reduce((acc, t) => acc + (t.quantity ?? 0), 0);
  const prices = ticketTypes.map((t) => t.priceCents || 0).filter((p) => p > 0);
  const priceFrom = prices.length ? Math.min(...prices) / 100 : 0;

  const rawStart = event?.startsAt || event?.startDate;
  const startsAt = rawStart ? new Date(rawStart) : null;
  const isClosed = startsAt ? Date.now() >= startsAt.getTime() - BOOKING_CUTOFF_MS : false;
  const isSoldOut = ticketTypes.length > 0 && available <= 0;
  const isLowStock = !isSoldOut && available > 0 && available <= LOW_STOCK_THRESHOLD;

  return {
    startsAt,
    available,
    total,
    priceFrom,
    isFree: ticketTypes.length > 0 && prices.length === 0,
    isClosed,
    isSoldOut,
    isLowStock,
    isBookable: !isClosed && !isSoldOut,
  };
}

export function formatPrice(dollars: number): string {
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** "Sat 31 Oct" — compact date for cards. */
export function formatShortDate(date: Date | null): string {
  if (!date) return 'Date TBA';
  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "7:30 pm" */
export function formatTime(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** "Forum Melbourne, Melbourne" — skips missing parts. */
export function formatVenue(event: any): string {
  return [event?.venue?.name, event?.venue?.city].filter(Boolean).join(', ');
}
