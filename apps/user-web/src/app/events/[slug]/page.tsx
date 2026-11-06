"use client";

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Clock, Info, AlertCircle, User, Ticket, CheckCircle, ChevronRight, Share2, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EventDetailsSkeleton } from '@/components/ui/Skeleton';
import SeatPicker, { seatedTierNamesOf } from '@/components/SeatPicker';
import { API_BASE } from '@/config/api';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useAuthStore } from '@/store/useAuthStore';

export default function EventDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [holding, setHolding] = useState(false);

  // Reserved Seating States
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seatTierMap, setSeatTierMap] = useState<Record<string, string>>({});
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [heldSeats, setHeldSeats] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    let seatInterval: ReturnType<typeof setInterval> | null = null;

    async function fetchEvent() {
      try {
        const res = await fetch(`${API_BASE}/events/${slug}`);
        if (!res.ok) {
          if (!cancelled) setError('Event not found');
          return;
        }
        // The backend returns every event column, including seatingType and seatingConfig.
        const data = await res.json();

        if (cancelled) return;
        setEvent(data);

        // If reserved seating, fetch booked & held seats (backend only — no direct DB access from the browser)
        if (data.seatingType === 'RESERVED') {
          const fetchSeatsStatus = async () => {
            try {
              const seatsRes = await fetch(`${API_BASE}/events/${slug}/seats`);
              if (!seatsRes.ok || cancelled) return;
              const seatsData = await seatsRes.json();
              if (cancelled) return;
              setBookedSeats(seatsData.bookedSeats || []);
              setHeldSeats(seatsData.heldSeats || []);
            } catch (e) {
              console.error("Could not load seat map status", e);
            }
          };

          await fetchSeatsStatus();
          // Poll seat availability every 10 seconds so bookings by other users reflect live.
          // The interval lives in the effect scope so the effect cleanup can clear it.
          if (!cancelled) {
            seatInterval = setInterval(fetchSeatsStatus, 10000);
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEvent();

    return () => {
      cancelled = true;
      if (seatInterval) clearInterval(seatInterval);
    };
  }, [slug]);

  const startsAt = event?.startsAt ? new Date(event.startsAt) : null;
  const now = new Date();
  const oneHourBeforeShow = startsAt ? new Date(startsAt.getTime() - 60 * 60 * 1000) : null;
  const isBookingClosed = oneHourBeforeShow ? now >= oneHourBeforeShow : false;
  const isEventSoldOut = Boolean(event?.ticketTypes?.length && event.ticketTypes.every((tt: any) => (tt.available ?? 0) <= 0));

  // Seat map: which ticket categories are sold as numbered seats, and which by quantity.
  // v2 seat maps list seated sections explicitly (standing zones are sold by quantity);
  // older seat maps treat every category as seated.
  const hasSeatMap = event?.seatingType === 'RESERVED' && event?.seatingConfig?.sections?.length > 0;
  const tierKey = (name: unknown) => String(name || '').trim().toLowerCase();
  const seatedTierKeys = new Set<string>(
    !hasSeatMap
      ? []
      : event.seatingConfig.version === 2
        ? seatedTierNamesOf(event.seatingConfig)
        : (event.ticketTypes || []).map((t: any) => tierKey(t.name))
  );
  const quantityTiers: any[] = (event?.ticketTypes || []).filter((t: any) => !seatedTierKeys.has(tierKey(t.name)));
  const isSeatSelection = selectedSeats.length > 0;

  /** Picks a quantity-based category (clears any seats, since one booking covers one category). */
  const selectQuantityTier = (id: string) => {
    if (selectedSeats.length > 0) {
      setSelectedSeats([]);
      setSeatTierMap({});
    }
    setQuantities({ [id]: (quantities[id] || 0) || 1 });
  };

  const handleToggleSeat = (seatKey: string, tierId: string) => {
    if (isBookingClosed) {
      toast.error("Ticket booking is closed for this event.");
      return;
    }
    if (isEventSoldOut) {
      toast.error("This event is sold out.");
      return;
    }
    if (selectedSeats.includes(seatKey)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatKey));
      setSeatTierMap(prev => {
        const copy = { ...prev };
        delete copy[seatKey];
        return copy;
      });
    } else {
      if (selectedSeats.length >= 10) {
        toast.error("Maximum 10 seats allowed per booking.");
        return;
      }
      const resolvedTierId = tierId || event?.ticketTypes?.[0]?.id || "";
      // A hold covers exactly one ticket type, so every seat in a booking must share the same price tier.
      const currentTierId = selectedSeats.length > 0 ? seatTierMap[selectedSeats[0]] : null;
      if (currentTierId && currentTierId !== resolvedTierId) {
        const currentTier = event?.ticketTypes?.find((t: any) => t.id === currentTierId);
        toast.error(`Seats from different price tiers must be booked separately. Your current selection is ${currentTier?.name || 'another tier'}.`);
        return;
      }
      setQuantities({});
      setSelectedSeats(prev => [...prev, seatKey]);
      setSeatTierMap(prev => ({
        ...prev,
        [seatKey]: resolvedTierId
      }));
    }
  };

  const handleShareEvent = async () => {
    if (!event) return;
    const url = typeof window !== 'undefined' ? window.location.href : `https://mytix.com.au/events/${slug}`;
    const title = event.title;
    const text = `🎟️ Join me at "${event.title}"! Book tickets on Mytix:`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User cancelled share dialog
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Event link copied to clipboard!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const isActionDisabled = holding || isBookingClosed || isEventSoldOut || (
    selectedSeats.length === 0 && Object.values(quantities).reduce((a, b) => a + b, 0) === 0
  );

  // Ticket subtotal only. The booking fee is configured on the backend and shown exactly at checkout.
  let selectedCount = 0;
  let computedTotal = 0;

  if (isSeatSelection) {
    selectedCount = selectedSeats.length;
    computedTotal = selectedSeats.reduce((sum, sKey) => {
      const tierId = seatTierMap[sKey];
      const tier = event.ticketTypes?.find((t: any) => t.id === tierId) || event.ticketTypes?.[0];
      return sum + (tier ? tier.priceCents / 100 : 0);
    }, 0);
  } else {
    const selectedId = Object.keys(quantities).find(id => quantities[id] > 0);
    if (selectedId) {
      const q = quantities[selectedId];
      selectedCount = q;
      const tt = event?.ticketTypes?.find((t: any) => t.id === selectedId);
      computedTotal = ((tt?.priceCents || 0) / 100) * q;
    }
  }

  /** Creates a hold; sends the user to log in first (and back here afterwards) if needed. */
  const createHold = async (body: Record<string, unknown>, failMessage: string) => {
    const loginUrl = `/auth?redirect=${encodeURIComponent(`/events/${slug}`)}`;
    // While the session is still being checked, let the request go through; a 401 is handled below.
    if (!user && !authLoading) {
      toast.error('Please sign in to book tickets.');
      router.push(loginUrl);
      return null;
    }
    const res = await fetchWithAuth(
      `${API_BASE}/holds`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      { redirectOnFail: false }
    );
    if (res.status === 401) {
      toast.error('Your session has expired. Please sign in again.');
      router.push(loginUrl);
      return null;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || failMessage);
    return data.data;
  };

  const handleHoldTickets = async () => {
    if (isBookingClosed) {
      toast.error('Ticket booking has closed for this event.');
      return;
    }
    if (isEventSoldOut) {
      toast.error('This event is sold out.');
      return;
    }

    if (selectedSeats.length > 0) {
      setHolding(true);
      try {
        const primaryTierId = seatTierMap[selectedSeats[0]] || event.ticketTypes?.[0]?.id;
        const hold = await createHold(
          { ticketTypeId: primaryTierId, quantity: selectedSeats.length, selectedSeats },
          'Failed to hold seats.'
        );
        if (!hold) return;
        toast.success('Seats held successfully! Proceeding to payment...');
        router.push(`/checkout?holdId=${hold.holdId}`);
      } catch(err: any) {
        toast.error(err.message);
      } finally {
        setHolding(false);
      }
      return;
    }

    // Quantity-based (general admission / standing) hold flow
    const selectedTypeId = Object.keys(quantities).find(id => quantities[id] > 0);
    if (!selectedTypeId) {
      toast.error(hasSeatMap ? 'Please pick your seats or choose a ticket.' : 'Please select a ticket.');
      return;
    }
    setHolding(true);
    try {
      const hold = await createHold(
        { ticketTypeId: selectedTypeId, quantity: quantities[selectedTypeId] },
        'Failed to hold tickets.'
      );
      if (!hold) return;
      if (hold.existing) {
        toast.success('Resuming your active ticket reservation...');
      } else {
        toast.success('Tickets held successfully! Proceeding to payment...');
      }
      router.push(`/checkout?holdId=${hold.holdId}`);
    } catch(err: any) {
      toast.error(err.message);
    } finally {
      setHolding(false);
    }
  };

  if (loading) {
    return <EventDetailsSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-extrabold">We couldn&apos;t find that event</h1>
        <p className="mt-2 text-slate-500">{error || 'It may have ended or been removed.'}</p>
        <Link href="/events" className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-ink-soft">
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-linear-to-b from-brand-50/80 via-white to-white">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="container-page py-5 text-sm text-slate-500">
        <Link href="/" className="hover:text-ink">Home</Link> <span className="mx-1.5 text-slate-300">/</span>
        <Link href="/events" className="hover:text-ink">Events</Link> <span className="mx-1.5 text-slate-300">/</span>
        <span className="text-ink font-medium">{event.title}</span>
      </nav>

      <div className="container-page flex flex-col md:flex-row gap-8 lg:gap-14 pb-24 md:pb-12">
        
        {/* Left Column (Poster & Trust badges) */}
        <div className="w-full md:w-[36%] flex flex-col gap-6 md:sticky md:top-24 md:self-start">
          <div className="relative w-full aspect-3/4 max-w-sm mx-auto md:max-w-none rounded-3xl overflow-hidden bg-slate-100 shadow-card ring-1 ring-inset ring-slate-900/5">
            {event.posterPath ? (
              <Image src={event.posterPath} alt={event.title} fill priority sizes="(max-width: 768px) 100vw, 36vw" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">No Poster</div>
            )}
          </div>
          
          <div className="hidden md:block rounded-2xl p-6 bg-brand-50 border border-brand-200">
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-brand-600 shrink-0" /> Secure checkout, processed by Stripe</li>
              <li className="flex items-start gap-3"><Ticket className="w-5 h-5 text-brand-600 shrink-0" /> QR e-tickets sent instantly after payment</li>
              <li className="flex items-start gap-3"><Info className="w-5 h-5 text-brand-600 shrink-0" /> Questions? Email support@mytix.com.au</li>
            </ul>
          </div>
        </div>

        {/* Right Column (Details & Tickets) */}
        <div className="w-full md:w-[65%] flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="inline-block bg-brand-50 text-brand-800 text-xs font-semibold px-3 py-1 rounded-full ring-1 ring-inset ring-brand-200">
              {event.category || 'Event'}
            </span>
            <button
              onClick={handleShareEvent}
              className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-full border border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50 text-sm font-semibold text-ink transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.05] mb-8">
            {event.title}
          </h1>

          {/* Date and Venue Cards */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-400 flex items-center justify-center text-ink shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-1">Date</p>
                <p className="font-bold text-ink text-sm">
                  {new Date(event.startsAt).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-slate-500 mt-1">Starts {new Date(event.startsAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                [event.venue?.name, event.venue?.address, event.venue?.city, event.venue?.state, 'Australia']
                  .filter(Boolean)
                  .join(', ')
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4 hover:border-brand-300 transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-400 flex items-center justify-center text-ink shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em]">Venue</p>
                  <span className="text-[11px] font-semibold text-ink flex items-center gap-1 group-hover:underline underline-offset-2">
                    <Navigation className="w-2.5 h-2.5" /> Directions
                  </span>
                </div>
                <p className="font-bold text-ink text-sm truncate">
                  {event.venue?.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {[event.venue?.address, event.venue?.city, event.venue?.state].filter(Boolean).join(', ') || 'Australia'}
                </p>
              </div>
            </a>
          </div>

          {/* Choose Tickets Section */}
          <div id="tickets" className="bg-white border border-brand-200 rounded-3xl overflow-hidden mb-12 shadow-card">
            <div className="px-6 py-5 border-b border-brand-100 bg-brand-50/70 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {hasSeatMap ? (quantityTiers.length > 0 ? 'Choose seats or tickets' : 'Select your seats') : 'Choose tickets'}
              </h2>
              {hasSeatMap && (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  {quantityTiers.length > 0 ? 'Seats + standing' : 'Numbered seating'}
                </span>
              )}
            </div>
            
            <div className="p-6">
              {/* Cutoff & Sold Out Warning Banners */}
              {isBookingClosed && (
                <div className="mb-6 p-4 rounded-2xl bg-ink text-slate-200 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      Online Ticket Booking Closed
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-400/20 text-brand-300 border border-brand-400/30 px-2 py-0.5 rounded">
                        1 Hr Cutoff
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Ticket bookings close 1 hour before the show starts. Show starts at {startsAt ? startsAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'TBA'} on {startsAt ? startsAt.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}.
                    </p>
                  </div>
                </div>
              )}

              {!isBookingClosed && isEventSoldOut && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-red-900">Sold out</h4>
                    <p className="text-sm text-red-700 mt-1">
                      All seats and tickets for this show have been completely booked. No more tickets are available online.
                    </p>
                  </div>
                </div>
              )}

              {hasSeatMap && (
                /* ===== SEAT MAP (rows / tables) ===== */
                <div className="space-y-6">
                  <SeatPicker
                    config={event.seatingConfig}
                    ticketTypes={event.ticketTypes || []}
                    selectedSeats={selectedSeats}
                    onToggleSeat={handleToggleSeat}
                    bookedSeats={bookedSeats}
                    heldSeats={heldSeats}
                    maxSeats={10}
                    disabled={isBookingClosed || isEventSoldOut}
                  />
                </div>
              )}

              {quantityTiers.length > 0 && (
                /* ===== QUANTITY TICKETS (general admission / standing areas) ===== */
                <>
                  {hasSeatMap && (
                    <div className="mt-8 mb-3">
                      <h3 className="font-bold text-ink">Standing &amp; general tickets</h3>
                      <p className="text-xs text-slate-500">No seat number — just choose how many.</p>
                    </div>
                  )}
                  <div className="space-y-3 mb-8">
                    {quantityTiers.map((tt: any) => {
                       const isSelected = !!quantities[tt.id];
                       const isSoldOut = tt.available <= 0;
                       const isLowStock = tt.available > 0 && tt.available <= 10;
                       const isDisabled = isBookingClosed || isEventSoldOut || isSoldOut;

                       return (
                         <div 
                           key={tt.id} 
                           onClick={() => {
                              if (isDisabled) return;
                              selectQuantityTier(tt.id);
                           }}
                           role="radio"
                           aria-checked={isSelected}
                           aria-disabled={isDisabled}
                           tabIndex={isDisabled ? -1 : 0}
                           onKeyDown={(e) => {
                              if (isDisabled || (e.key !== 'Enter' && e.key !== ' ')) return;
                              e.preventDefault();
                              selectQuantityTier(tt.id);
                           }}
                           className={`p-4 rounded-2xl border transition-colors flex items-center justify-between gap-4 ${
                             isDisabled
                               ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                               : isSelected
                                 ? 'border-ink bg-brand-50/60 ring-1 ring-ink cursor-pointer'
                                 : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 bg-white cursor-pointer'
                           }`}
                         >
                           <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <h4 className="font-bold text-ink">{tt.name || 'General admission'}</h4>
                               {isSoldOut ? (
                                 <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                                   Sold Out
                                 </span>
                               ) : isLowStock ? (
                                 <span className="text-[11px] font-semibold text-brand-800 bg-brand-100 px-2 py-0.5 rounded-full">
                                   Only {tt.available} left
                                 </span>
                               ) : (
                                 <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                   {tt.available} available
                                 </span>
                               )}
                             </div>
                             <p className="text-xs text-slate-400 mt-1">
                               {isSoldOut ? 'No tickets remaining for this category' : `Max ${tt.maxPerOrder || 10} tickets per booking`}
                             </p>
                           </div>
                           <div className={`font-bold text-lg tabular-nums ${isSoldOut ? 'text-slate-400' : 'text-ink'}`}>
                             ${(tt.priceCents / 100).toLocaleString('en-AU')}
                           </div>
                         </div>
                       );
                    })}
                  </div>

                  {/* Quantity Selector */}
                  {Object.keys(quantities).some(id => quantities[id] > 0) && (
                    <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between mb-8">
                      <div>
                        <span className="font-semibold text-sm text-ink block">Quantity</span>
                        {(() => {
                          const selectedId = Object.keys(quantities).find(id => quantities[id] > 0)!;
                          const selectedTier = event.ticketTypes?.find((t: any) => t.id === selectedId);
                          return (
                            <span className="text-xs text-slate-500">
                              {selectedTier?.available} tickets left in this tier
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full p-1">
                        {(() => {
                           const selectedId = Object.keys(quantities).find(id => quantities[id] > 0)!;
                           const q = quantities[selectedId];
                           const selectedTier = event.ticketTypes?.find((t: any) => t.id === selectedId);
                           const maxAllowed = Math.min(selectedTier?.maxPerOrder || 10, selectedTier?.available || 10);

                           return (
                             <>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setQuantities({ [selectedId]: Math.max(1, q - 1) }) }} 
                                 aria-label="Decrease quantity"
                                 className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 text-ink font-bold"
                               >
                                 -
                               </button>
                               <span className="font-bold text-ink w-5 text-center">{q}</span>
                               <button 
                                 disabled={q >= maxAllowed}
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   if (q < maxAllowed) {
                                     setQuantities({ [selectedId]: q + 1 });
                                   }
                                 }} 
                                 aria-label="Increase quantity"
                                 className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 text-ink font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                               >
                                 +
                               </button>
                             </>
                           );
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Reserved Total Summary */}
              {isSeatSelection && (() => {
                return (
                  <div className="border-t border-slate-100 pt-6 mt-6">
                    <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                      <span>{selectedSeats.length} × Reserved Seat{selectedSeats.length > 1 ? 's' : ''}</span>
                      <span>${computedTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                      <span>Booking fee</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-bold text-ink mb-6 border-t border-dashed border-slate-200 pt-4">
                      <span>Subtotal</span>
                      <span>${computedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* General Admission Total Summary */}
              {!isSeatSelection && Object.keys(quantities).some(id => quantities[id] > 0) && (() => {
                 const selectedId = Object.keys(quantities).find(id => quantities[id] > 0)!;
                 const q = quantities[selectedId];
                 const tt = event.ticketTypes.find((t: any) => t.id === selectedId);
                 const subtotal = computedTotal;

                 return (
                   <div className="border-t border-slate-100 pt-6">
                     <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                       <span>{q} × {tt?.name || 'General admission'}</span>
                       <span>${subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                       <span>Booking fee</span>
                       <span>Calculated at checkout</span>
                     </div>
                     <div className="flex items-center justify-between text-lg font-bold text-ink mb-6 border-t border-dashed border-slate-200 pt-4">
                       <span>Subtotal</span>
                       <span>${subtotal.toFixed(2)}</span>
                     </div>
                   </div>
                 );
              })()}

              {/* Action Button */}
              <button 
                disabled={isActionDisabled}
                onClick={handleHoldTickets}
                className={`w-full h-13 font-semibold rounded-full transition-colors text-base ${
                  isBookingClosed || isEventSoldOut
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-brand-400 hover:bg-brand-300 text-ink cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {holding 
                  ? 'Securing your tickets…' 
                  : isBookingClosed
                    ? 'Online booking closed'
                    : isEventSoldOut
                      ? 'Sold Out'
                      : isSeatSelection
                        ? `Reserve ${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''}`
                        : hasSeatMap && quantityTiers.length === 0
                          ? 'Reserve seats'
                          : 'Get tickets'}
              </button>
            </div>
          </div>

          {/* Mobile Trust Badges Box */}
          <div className="md:hidden mb-12 rounded-2xl p-5 bg-brand-50 border border-brand-200">
            <ul className="space-y-3.5 text-sm text-slate-600">
              <li className="flex items-start gap-2.5"><CheckCircle className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" /> Secure checkout, processed by Stripe</li>
              <li className="flex items-start gap-2.5"><Ticket className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" /> QR e-tickets sent instantly after payment</li>
              <li className="flex items-start gap-2.5"><Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" /> Questions? Email support@mytix.com.au</li>
            </ul>
          </div>

          {/* Performing Artists / Lineup */}
          {event.artists && event.artists.length > 0 && (
            <div className="mb-12 border-t border-slate-200 pt-10">
              <h2 className="text-xl font-extrabold mb-6">Lineup</h2>
              <div className="flex items-center gap-6 overflow-x-auto pb-4">
                {event.artists.map((item: any, idx: number) => {
                  const art = item.artist || item;
                  return (
                    <div key={art.id || idx} className="flex flex-col items-center text-center w-24 shrink-0">
                      <div className="w-16 h-16 rounded-full bg-brand-50 ring-2 ring-white shadow-card overflow-hidden relative mb-2">
                        {art.imagePath ? (
                          <Image src={art.imagePath} alt={art.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-brand-700 text-lg">
                            {art.name ? art.name[0] : 'A'}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-xs text-ink truncate max-w-full">
                        {art.name}
                      </span>
                      {item.isHeadline && (
                        <span className="mt-1 text-[10px] font-semibold text-brand-800 bg-brand-100 px-2 py-0.5 rounded-full">
                          Headliner
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* About This Event */}
          <div className="mb-12 border-t border-slate-200 pt-10">
            <h2 className="text-xl font-extrabold mb-4">About this event</h2>
            <p className="text-slate-600 leading-relaxed mb-6 whitespace-pre-line">
              Presented by {event.organiser?.businessName || 'Organiser'}. {event.description}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
               <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> QR e-ticket issued instantly after payment</div>
               <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Confirmation and tax invoice sent by email</div>
               <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Booking fee shown before you pay</div>
               <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Entry rules are set by the venue and organiser</div>
            </div>
          </div>

          {/* Venue Address */}
          <div className="border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div>
               <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-1">Venue Address</h3>
               <p className="font-bold text-ink text-sm mb-0.5">{event.venue?.name}</p>
               <p className="text-sm text-slate-500">{[event.venue?.address, event.venue?.city, event.venue?.state].filter(Boolean).join(', ')}</p>
             </div>
             <a href={`https://maps.google.com/?q=${event.venue?.name},${event.venue?.city}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 px-4 border border-slate-200 rounded-full text-sm font-semibold text-ink hover:border-slate-400 transition-colors shrink-0">
                Open in Maps <ChevronRight className="w-3 h-3" />
             </a>
          </div>

        </div>
      </div>

      {/* Floating Sticky Mobile Booking Bar */}
      {selectedCount > 0 && !isBookingClosed && !isEventSoldOut && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block leading-tight">
              {selectedCount} {isSeatSelection ? (selectedCount > 1 ? 'Seats' : 'Seat') : (selectedCount > 1 ? 'Tickets' : 'Ticket')}
            </span>
            <span className="text-lg font-bold text-ink leading-tight tabular-nums">
              ${computedTotal.toFixed(2)} <span className="text-xs font-semibold text-slate-500">AUD + fees</span>
            </span>
          </div>
          <button
            disabled={holding}
            onClick={handleHoldTickets}
            className="h-11 px-6 bg-brand-400 hover:bg-brand-300 text-ink font-semibold rounded-full text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {holding ? 'Holding...' : isSeatSelection ? 'Reserve Seats' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
