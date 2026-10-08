"use client";

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Clock, Info, AlertCircle, User, Ticket, CheckCircle, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EventDetailsSkeleton } from '@/components/ui/Skeleton';

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

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${slug}`);
        if (!res.ok) {
          // Map slug to a dummy fallback
          const fallbackImages = [
            '/images/events/et00444235-xycckhvdak-portrait.webp',
            '/images/events/et00477911-leqzyrmedu-portrait.webp',
            '/images/events/et00507337-uhvekqvrcs-portrait.webp',
            '/images/events/et00507738-kfbeunsutt-portrait.webp',
            '/images/events/et00512226-ahnwsmsljv-portrait.webp'
          ];
          // Map specific slugs to their exact image index from the home page
          const slugToIndex: Record<string, number> = {
            'the-vyxan': 0,
            'drishyam-the-conclusion': 1,
            'doraemon-nobita': 2,
            'hanuman-ansh': 3,
            'prem-ki-kahani': 4
          };
          const imageIndex = slugToIndex[slug] !== undefined ? slugToIndex[slug] : (slug.length % fallbackImages.length);
          
          setEvent({
            title: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            startsAt: new Date(Date.now() + 864000000).toISOString(),
            description: 'Join us for an unforgettable night! Experience the biggest hits live with spectacular stage production.\n\nExpect an amazing crowd and an unforgettable performance.',
            venue: { name: 'PVR Cinemas', city: 'Mumbai', state: 'MH', address: 'Phoenix Mall, Lower Parel' },
            ticketTypes: [{ priceCents: 499900 }],
            artists: [
              { isHeadline: true, artist: { id: '1', name: 'Lead Artist', imagePath: '/images/events/default-poster.jpg' } }
            ],
            organiser: { businessName: 'Mytix Entertainment' },
            posterPath: fallbackImages[imageIndex]
          });
          return;
        }
        const data = await res.json();
        setEvent(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [slug]);

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
        <Link href="/" className="hover:text-blue-600">Home</Link> <span className="mx-2">/</span>
        <Link href="/" className="hover:text-blue-600">Events</Link> <span className="mx-2">/</span>
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
          
          <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100/50">
            <ul className="space-y-4 text-sm text-gray-600 font-medium">
              <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-blue-600 shrink-0" /> Every booking confirmed by our team</li>
              <li className="flex items-start gap-3"><Ticket className="w-5 h-5 text-blue-600 shrink-0" /> No payment taken on the website</li>
              <li className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-600 shrink-0" /> Questions? Call 0455 600 003</li>
            </ul>
          </div>
        </div>

        {/* Right Column (Details & Tickets) */}
        <div className="w-full md:w-[65%] flex flex-col">
          <div className="mb-2">
            <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-md">
              CONCERT
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
            {event.title}
          </h1>

          {/* Date and Venue Cards */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="flex-1 border border-gray-100 rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
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

            <div className="flex-1 border border-gray-100 rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Venue</p>
                <p className="font-bold text-gray-900 text-sm">
                  {event.venue?.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">{event.venue?.city}</p>
              </div>
            </div>
          </div>

          {/* Choose Tickets Section */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-12">
            <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Choose Tickets</h3>
            </div>
            
            <div className="p-6">
              {/* Tickets List */}
              <div className="space-y-3 mb-8">
                {event.ticketTypes?.map((tt: any) => {
                   const isSelected = !!quantities[tt.id];
                   const isSoldOut = tt.available <= 0;
                   const isLowStock = tt.available > 0 && tt.available <= 10;

                   return (
                     <div 
                       key={tt.id} 
                       onClick={() => {
                          if (isSoldOut) return;
                          setQuantities({ [tt.id]: (quantities[tt.id] || 0) || 1 });
                       }}
                       className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                         isSoldOut 
                           ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                           : isSelected 
                             ? 'border-blue-600 bg-blue-50/30 cursor-pointer shadow-sm' 
                             : 'border-gray-100 hover:border-blue-200 bg-white cursor-pointer'
                       }`}
                     >
                       <div className="flex-1">
                         <div className="flex items-center gap-2">
                           <h4 className={`font-bold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{tt.name || 'GENERAL'}</h4>
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
                       <div className={`font-extrabold text-lg ${isSoldOut ? 'text-gray-400' : isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                         ₹{(tt.priceCents / 100).toLocaleString('en-IN')}
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

              {/* Total Summary */}
              {Object.keys(quantities).some(id => quantities[id] > 0) && (() => {
                 const selectedId = Object.keys(quantities).find(id => quantities[id] > 0)!;
                 const q = quantities[selectedId];
                 const tt = event.ticketTypes.find((t: any) => t.id === selectedId);
                 const price = (tt?.priceCents || 0) / 100;
                 const subtotal = price * q;
                 const fee = Math.floor(subtotal * 0.05); // 5% fee dummy
                 const total = subtotal + fee;

                 return (
                   <div className="border-t border-gray-100 pt-6">
                     <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                       <span>{q} × {tt?.name || 'GENERAL'}</span>
                       <span>₹{subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                       <span>Booking fee</span>
                       <span>₹{fee.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center justify-between text-lg font-bold text-gray-900 mb-6 border-t border-gray-100 pt-4">
                       <span>Total</span>
                       <span>₹{total.toFixed(2)}</span>
                     </div>
                   </div>
                 );
              })()}

              <button 
                disabled={holding || Object.values(quantities).reduce((a,b)=>a+b, 0) === 0}
                onClick={async () => {
                  const selectedTypeId = Object.keys(quantities).find(id => quantities[id] > 0);
                  if (!selectedTypeId) {
                    toast.error('Please select a ticket.');
                    return;
                  }
                  setHolding(true);
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/holds`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {holding ? 'Securing Tickets...' : 'Get tickets'}
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
