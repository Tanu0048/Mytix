"use client";

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Clock, Info, AlertCircle, User, Ticket } from 'lucide-react';
import { toast } from 'sonner';

export default function EventDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
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
        const res = await fetch(`http://localhost:5000/api/v1/events/${slug}`);
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
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div></div>;
  }

  if (error || !event) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Event not found'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <div className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 relative rounded-xl overflow-hidden shadow-2xl bg-gray-800" style={{ aspectRatio: '3 / 4' }}>
            {event.posterPath ? (
              <Image src={event.posterPath} alt={event.title} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">No Poster</div>
            )}
          </div>
          <div className="w-full md:w-2/3 flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-300 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#f8cb46]" />
                <span>{new Date(event.startsAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#f8cb46]" />
                <span>{new Date(event.startsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#f8cb46]" />
                <span>{event.venue?.name}, {event.venue?.city}</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 inline-block w-fit mb-6">
              <div className="text-sm text-gray-400 mb-1">Starting from</div>
              <div className="text-3xl font-bold">₹{event.ticketTypes?.[0] ? event.ticketTypes[0].priceCents / 100 : 'TBA'}</div>
            </div>
            <button 
              onClick={() => document.getElementById('ticket-selection')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#f8cb46] hover:bg-yellow-500 text-black font-bold py-4 px-12 rounded-lg text-lg transition-colors w-full md:w-fit">
              Book Tickets
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-12">
        <div className="w-full md:w-2/3">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About The Event</h2>
          <div className="text-gray-700 leading-relaxed whitespace-pre-line">
            {event.description}
          </div>

          {event.artists?.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Artists</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {event.artists.map((ea: any) => (
                  <div key={ea.artist.id} className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden relative mb-3">
                       {ea.artist.imagePath ? <Image src={ea.artist.imagePath} alt={ea.artist.name} fill className="object-cover" /> : <User className="w-12 h-12 m-6 text-gray-400" />}
                    </div>
                    <div className="font-bold text-gray-900">{ea.artist.name}</div>
                    <div className="text-xs text-[#f8cb46] font-semibold uppercase">{ea.isHeadline ? 'Headliner' : 'Supporting'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Selection Area */}
          <div id="ticket-selection" className="mt-12 bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Ticket className="w-6 h-6 text-[#f8cb46]" /> Select Tickets</h2>
            {!holdData ? (
              <div className="space-y-4">
                {event.ticketTypes?.map((tt: any) => (
                  <div key={tt.id || tt.priceCents} className="flex items-center justify-between p-4 border rounded-lg hover:border-[#f8cb46] transition-colors">
                    <div>
                      <div className="font-bold text-lg text-gray-900">{tt.name || 'General Admission'}</div>
                      <div className="text-sm text-gray-500">₹{tt.priceCents / 100}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setQuantities(prev => ({ ...prev, [tt.id]: Math.max(0, (prev[tt.id] || 0) - 1) }))}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200"
                      >-</button>
                      <span className="font-semibold w-4 text-center">{quantities[tt.id] || 0}</span>
                      <button 
                        onClick={() => setQuantities(prev => ({ ...prev, [tt.id]: (prev[tt.id] || 0) + 1 }))}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200"
                      >+</button>
                    </div>
                  </div>
                ))}
                
                {holdError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{holdError}</div>}
                
                <button 
                  onClick={async () => {
                    const selectedTypeId = Object.keys(quantities).find(id => quantities[id] > 0);
                    if (!selectedTypeId) {
                      toast.error('Please select at least one ticket.');
                      setHoldError('Please select at least one ticket.');
                      return;
                    }
                    setHolding(true);
                    setHoldError('');
                    try {
                      const res = await fetch('http://localhost:5000/api/v1/holds', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ ticketTypeId: selectedTypeId, quantity: quantities[selectedTypeId] })
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to hold tickets. Please login first.');
                      setHoldData(data.data);
                      toast.success('Tickets held successfully!');
                    } catch(err: any) {
                      setHoldError(err.message);
                      toast.error(err.message);
                    } finally {
                      setHolding(false);
                    }
                  }}
                  disabled={holding || Object.values(quantities).reduce((a,b)=>a+b, 0) === 0}
                  className="w-full mt-4 bg-[#f8cb46] text-black font-bold py-3 rounded-lg hover:bg-[#e5b830] transition-colors disabled:opacity-50"
                >
                  {holding ? 'Holding Inventory...' : 'Proceed to Checkout'}
                </button>
              </div>
            ) : (
              <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Tickets Held Successfully!</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Your tickets are locked for 10 minutes. Please complete your payment.
                </p>
                <button 
                  className="bg-green-600 hover:bg-green-700 text-black font-bold py-3 px-8 rounded-lg transition-colors"
                  onClick={() => alert('Payment Gateway Integration Pending!')}
                >
                  Pay ₹{(holdData.expiresAt ? '...' : '')} Now
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-1/3">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" /> Venue Details</h3>
            <div className="font-semibold">{event.venue?.name}</div>
            <div className="text-sm text-gray-600 mt-1">{event.venue?.address}</div>
            <div className="text-sm text-gray-600">{event.venue?.city}, {event.venue?.state}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Info className="w-5 h-5" /> Additional Info</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Please arrive 30 minutes before the show.</li>
              <li>• No outside food or beverages allowed.</li>
              <li>• Tickets are non-refundable.</li>
              <li>• Organized by <span className="font-semibold">{event.organiser?.businessName}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
