"use client";

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Clock, Info, AlertCircle, User, Ticket, CheckCircle, ChevronRight, Share2, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EventDetailsSkeleton } from '@/components/ui/Skeleton';
import SeatPicker from '@/components/SeatPicker';
import { API_BASE } from '@/config/api';
import { supabase } from '@/lib/supabase';

export default function EventDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [holdError, setHoldError] = useState('');
  const [holding, setHolding] = useState(false);
  const [holdData, setHoldData] = useState<any>(null);

  // Reserved Seating States
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seatTierMap, setSeatTierMap] = useState<Record<string, string>>({});
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [heldSeats, setHeldSeats] = useState<string[]>([]);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`${API_BASE}/events/${slug}`);
        if (!res.ok) {
          setError('Event not found');
          return;
        }
        let data = await res.json();

        // If backend API is running a build where seatingType or seatingConfig is not included, fetch directly from Supabase
        if (!data.seatingConfig || !data.seatingType) {
          try {
            const { data: sbEvent } = await supabase
              .from('events')
              .select('seating_type, seating_config')
              .eq('slug', slug)
              .single();
            if (sbEvent) {
              data.seatingType = sbEvent.seating_type || data.seatingType || 'GENERAL';
              data.seatingConfig = sbEvent.seating_config || data.seatingConfig || null;
            }
          } catch (sbErr) {
            console.warn('Supabase seatingConfig fallback err:', sbErr);
          }
        }

        setEvent(data);

        // If reserved seating, fetch booked & held seats
        if (data.seatingType === 'RESERVED') {
          const fetchSeatsStatus = async () => {
            try {
              const seatsRes = await fetch(`${API_BASE}/events/${slug}/seats`);
              if (seatsRes.ok) {
                const seatsData = await seatsRes.json();
                setBookedSeats(seatsData.bookedSeats || []);
                setHeldSeats(seatsData.heldSeats || []);
                return;
              }

              // Fallback: Query Supabase tickets table directly for booked seats
              const { data: tickets } = await supabase
                .from('tickets')
                .select('seat_row, seat_number, section_name')
                .neq('status', 'CANCELLED');

              if (tickets && tickets.length > 0) {
                const booked = tickets
                  .filter((t: any) => t.seat_row && t.seat_number)
                  .map((t: any) => {
                    const sec = t.section_name || '';
                    return sec ? `${sec}:${t.seat_row}-${t.seat_number}` : `${t.seat_row}-${t.seat_number}`;
                  });
                setBookedSeats(booked);
              }
            } catch (e) {
              console.error("Could not load seat map status", e);
            }
          };

          await fetchSeatsStatus();
          // Poll seat availability every 10 seconds so bookings by other users reflect live
          const seatInterval = setInterval(fetchSeatsStatus, 10000);
          return () => clearInterval(seatInterval);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [slug]);

  const startsAt = event?.startsAt ? new Date(event.startsAt) : null;
  const now = new Date();
  const oneHourBeforeShow = startsAt ? new Date(startsAt.getTime() - 60 * 60 * 1000) : null;
  const isBookingClosed = oneHourBeforeShow ? now >= oneHourBeforeShow : false;
  const isEventSoldOut = Boolean(event?.ticketTypes?.length && event.ticketTypes.every((tt: any) => (tt.available ?? 0) <= 0));

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

  if (loading) {
    return <EventDetailsSkeleton />;
  }

  if (error || !event) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Event not found'}</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-amber-600">Home</Link> <span className="mx-2">/</span>
        <Link href="/events" className="hover:text-amber-600">Events</Link> <span className="mx-2">/</span>
        <span className="text-gray-900">{event.title}</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-10">
        
        {/* Left Column (Poster & Trust badges) */}
        <div className="w-full md:w-[35%] flex flex-col gap-6">
          <div className="relative w-full aspect-3/4 rounded-xl overflow-hidden shadow-sm border border-gray-100">
            {event.posterPath ? (
              <Image src={event.posterPath} alt={event.title} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">No Poster</div>
            )}
          </div>
          
          <div className="bg-amber-50/50 rounded-xl p-6 border border-amber-200/50">
            <ul className="space-y-4 text-sm text-gray-700 font-medium">
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-amber-600 shrink-0" /> Every booking confirmed by our team</li>
              <li className="flex items-start gap-3"><Ticket className="w-5 h-5 text-amber-600 shrink-0" /> No payment taken on the website</li>
              <li className="flex items-start gap-3"><Info className="w-5 h-5 text-amber-600 shrink-0" /> Questions? Email support@mytix.com.au</li>
            </ul>
          </div>
        </div>

        {/* Right Column (Details & Tickets) */}
        <div className="w-full md:w-[65%] flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-md border border-amber-300/50">
              {event.category || 'CONCERT'}
            </span>
            <button
              onClick={handleShareEvent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-600" />
              Share Event
            </button>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
            {event.title}
          </h1>

          {/* Date and Venue Cards */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="flex-1 border border-gray-100 rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p>
                <p className="font-bold text-gray-900 text-sm">
                  {new Date(event.startsAt).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Doors: {new Date(event.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
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
              className="flex-1 border border-gray-100 rounded-xl p-5 flex items-start gap-4 hover:border-amber-300 hover:bg-amber-50/30 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Venue</p>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-amber-100 transition-colors">
                    <Navigation className="w-2.5 h-2.5" /> Directions
                  </span>
                </div>
                <p className="font-bold text-gray-900 text-sm group-hover:text-amber-800 transition-colors truncate">
                  {event.venue?.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {[event.venue?.address, event.venue?.city, event.venue?.state].filter(Boolean).join(', ') || 'Australia'}
                </p>
              </div>
            </a>
          </div>

          {/* Choose Tickets Section */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-12">
            <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {event.seatingType === 'RESERVED' ? 'Select Your Seats' : 'Choose Tickets'}
              </h3>
              {event.seatingType === 'RESERVED' && (
                <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                  Numbered Seating
                </span>
              )}
            </div>
            
            <div className="p-6">
              {/* Cutoff & Sold Out Warning Banners */}
              {isBookingClosed && (
                <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 flex items-start gap-3 shadow-md">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      Online Ticket Booking Closed
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
                        1 Hr Cutoff
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Ticket bookings close 1 hour before the show starts. Show starts at {startsAt ? startsAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'TBA'} on {startsAt ? startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}.
                    </p>
                  </div>
                </div>
              )}

              {!isBookingClosed && isEventSoldOut && (
                <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-800/60 text-red-200 flex items-start gap-3 shadow-md">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Sold Out</h4>
                    <p className="text-xs text-red-300 mt-1">
                      All seats and tickets for this show have been completely booked. No more tickets are available online.
                    </p>
                  </div>
                </div>
              )}

              {event.seatingType === 'RESERVED' && event.seatingConfig?.sections?.length > 0 ? (
                /* ===== RESERVED SEATING: VISUAL MAP ===== */
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
              ) : (
                /* ===== GENERAL ADMISSION: LIST SELECTOR ===== */
                <>
                  <div className="space-y-3 mb-8">
                    {event.ticketTypes?.map((tt: any) => {
                       const isSelected = !!quantities[tt.id];
                       const isSoldOut = tt.available <= 0;
                       const isLowStock = tt.available > 0 && tt.available <= 10;
                       const isDisabled = isBookingClosed || isEventSoldOut || isSoldOut;

                       return (
                         <div 
                           key={tt.id} 
                           onClick={() => {
                              if (isDisabled) return;
                              setQuantities({ [tt.id]: (quantities[tt.id] || 0) || 1 });
                           }}
                           className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                             isDisabled 
                               ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                               : isSelected 
                                 ? 'border-amber-400 bg-amber-50/50 cursor-pointer shadow-sm ring-1 ring-amber-400/20' 
                                 : 'border-gray-100 hover:border-amber-300 bg-white cursor-pointer'
                           }`}
                         >
                           <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <h4 className={`font-bold ${isSelected ? 'text-amber-950' : 'text-gray-900'}`}>{tt.name || 'GENERAL'}</h4>
                               {isSoldOut ? (
                                 <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                   Sold Out
                                 </span>
                               ) : isLowStock ? (
                                 <span className="text-[11px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                   🔥 Only {tt.available} left!
                                 </span>
                               ) : (
                                 <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                   {tt.available} seats available
                                 </span>
                               )}
                             </div>
                             <p className="text-xs text-gray-400 mt-1">
                               {isSoldOut ? 'No tickets remaining for this category' : `Max ${tt.maxPerOrder || 10} tickets per booking`}
                             </p>
                           </div>
                           <div className={`font-extrabold text-lg ${isSoldOut ? 'text-gray-400' : isSelected ? 'text-amber-900' : 'text-gray-900'}`}>
                             ${(tt.priceCents / 100).toLocaleString('en-AU')}
                           </div>
                         </div>
                       );
                    })}
                  </div>

                  {/* Quantity Selector */}
                  {Object.keys(quantities).some(id => quantities[id] > 0) && (
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between mb-8 border border-gray-100">
                      <div>
                        <span className="font-bold text-sm text-gray-900 block">Select Seats / Tickets</span>
                        {(() => {
                          const selectedId = Object.keys(quantities).find(id => quantities[id] > 0)!;
                          const selectedTier = event.ticketTypes?.find((t: any) => t.id === selectedId);
                          return (
                            <span className="text-xs text-gray-500">
                              {selectedTier?.available} tickets left in this tier
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                        {(() => {
                           const selectedId = Object.keys(quantities).find(id => quantities[id] > 0)!;
                           const q = quantities[selectedId];
                           const selectedTier = event.ticketTypes?.find((t: any) => t.id === selectedId);
                           const maxAllowed = Math.min(selectedTier?.maxPerOrder || 10, selectedTier?.available || 10);

                           return (
                             <>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setQuantities({ [selectedId]: Math.max(1, q - 1) }) }} 
                                 className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-100 text-gray-700 font-bold"
                               >
                                 -
                               </button>
                               <span className="font-bold text-gray-900 w-5 text-center">{q}</span>
                               <button 
                                 disabled={q >= maxAllowed}
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   if (q < maxAllowed) {
                                     setQuantities({ [selectedId]: q + 1 });
                                   }
                                 }} 
                                 className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-100 text-gray-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed"
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
              {event.seatingType === 'RESERVED' && selectedSeats.length > 0 && (() => {
                const reservedSubtotal = selectedSeats.reduce((sum, sKey) => {
                  const tierId = seatTierMap[sKey];
                  const tier = event.ticketTypes?.find((t: any) => t.id === tierId) || event.ticketTypes?.[0];
                  return sum + (tier ? tier.priceCents / 100 : 0);
                }, 0);
                const reservedFee = Math.floor(reservedSubtotal * 0.05);
                const reservedTotal = reservedSubtotal + reservedFee;

                return (
                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                      <span>{selectedSeats.length} × Reserved Seat{selectedSeats.length > 1 ? 's' : ''}</span>
                      <span>${reservedSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>Booking fee</span>
                      <span>${reservedFee.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-bold text-gray-900 mb-6 border-t border-gray-100 pt-4">
                      <span>Total</span>
                      <span>${reservedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* General Admission Total Summary */}
              {event.seatingType !== 'RESERVED' && Object.keys(quantities).some(id => quantities[id] > 0) && (() => {
                 const selectedId = Object.keys(quantities).find(id => quantities[id] > 0)!;
                 const q = quantities[selectedId];
                 const tt = event.ticketTypes.find((t: any) => t.id === selectedId);
                 const price = (tt?.priceCents || 0) / 100;
                 const subtotal = price * q;
                 const fee = Math.floor(subtotal * 0.05);
                 const total = subtotal + fee;

                 return (
                   <div className="border-t border-gray-100 pt-6">
                     <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                       <span>{q} × {tt?.name || 'GENERAL'}</span>
                       <span>${subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                       <span>Booking fee</span>
                       <span>${fee.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center justify-between text-lg font-bold text-gray-900 mb-6 border-t border-gray-100 pt-4">
                       <span>Total</span>
                       <span>${total.toFixed(2)}</span>
                     </div>
                   </div>
                 );
              })()}

              {/* Action Button */}
              <button 
                disabled={
                  holding || 
                  isBookingClosed ||
                  isEventSoldOut ||
                  (event.seatingType === 'RESERVED' 
                    ? selectedSeats.length === 0 
                    : Object.values(quantities).reduce((a,b)=>a+b, 0) === 0)
                }
                onClick={async () => {
                  if (isBookingClosed) {
                    toast.error('Ticket booking has closed for this event.');
                    return;
                  }
                  if (isEventSoldOut) {
                    toast.error('This event is sold out.');
                    return;
                  }

                  if (event.seatingType === 'RESERVED') {
                    if (selectedSeats.length === 0) {
                      toast.error('Please select at least one seat.');
                      return;
                    }
                    setHolding(true);
                    try {
                      const primaryTierId = seatTierMap[selectedSeats[0]] || event.ticketTypes?.[0]?.id;
                      const res = await fetch(`${API_BASE}/holds`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({ 
                          ticketTypeId: primaryTierId, 
                          quantity: selectedSeats.length,
                          selectedSeats 
                        })
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to hold seats.');
                      setHoldData(data.data);
                      toast.success('Seats held successfully! Proceeding to payment...');
                      router.push(`/checkout?holdId=${data.data.holdId}`);
                    } catch(err: any) {
                      toast.error(err.message);
                    } finally {
                      setHolding(false);
                    }
                    return;
                  }

                  // General Admission hold flow
                  const selectedTypeId = Object.keys(quantities).find(id => quantities[id] > 0);
                  if (!selectedTypeId) {
                    toast.error('Please select a ticket.');
                    return;
                  }
                  setHolding(true);
                  try {
                    const res = await fetch(`${API_BASE}/holds`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json'
                      },
                      credentials: 'include',
                      body: JSON.stringify({ ticketTypeId: selectedTypeId, quantity: quantities[selectedTypeId] })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to hold tickets.');
                    setHoldData(data.data);
                    if (data.data.existing) {
                      toast.success('Resuming your active ticket reservation...');
                    } else {
                      toast.success('Tickets held successfully! Proceeding to payment...');
                    }
                    router.push(`/checkout?holdId=${data.data.holdId}`);
                  } catch(err: any) {
                    toast.error(err.message);
                  } finally {
                    setHolding(false);
                  }
                }}
                className={`w-full font-extrabold py-4 rounded-xl transition-all text-base tracking-wide ${
                  isBookingClosed || isEventSoldOut
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80'
                    : 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {holding 
                  ? 'Securing Tickets...' 
                  : isBookingClosed
                    ? 'Online Booking Closed'
                    : isEventSoldOut
                      ? 'Sold Out'
                      : event.seatingType === 'RESERVED' 
                        ? `Reserve ${selectedSeats.length > 0 ? `${selectedSeats.length} Seats` : 'Seats'}` 
                        : 'Get tickets'}
              </button>
            </div>
          </div>

          {/* About This Event */}
          <div className="mb-12 border-t border-gray-200 pt-10">
            <h2 className="text-xl font-extrabold text-gray-900 mb-4">About this event</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-line">
              Presented by {event.organiser?.businessName || 'Organiser'}. {event.description}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 font-medium">
               <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Send a booking request - no payment online</div>
               <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Our team contacts you to confirm</div>
               <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Booking fee shown before you request</div>
               <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> Entry rules are set by the venue and organiser</div>
            </div>
          </div>

          {/* Venue Address */}
          <div className="border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div>
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Venue Address</h3>
               <p className="font-bold text-gray-900 text-sm mb-0.5">{event.venue?.name}</p>
               <p className="text-sm text-gray-500">{event.venue?.address}, {event.venue?.city}, {event.venue?.state}</p>
             </div>
             <a href={`https://maps.google.com/?q=${event.venue?.name},${event.venue?.city}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-xs font-bold text-gray-900 hover:bg-gray-50 transition-colors shrink-0">
                Open in Maps <ChevronRight className="w-3 h-3" />
             </a>
          </div>

        </div>
      </div>
    </div>
  );
}
