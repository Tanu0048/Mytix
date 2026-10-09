"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, Filter, Search, Loader2 } from 'lucide-react';
import { EventCardSkeleton } from '@/components/ui/Skeleton';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getFullImageUrl(path: string | undefined): string {
  if (!path) return 'https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?w=800&q=80';
  if (path.startsWith('http')) return path;
  const backendHost = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  return `${backendHost}${path}`;
}

const AUSTRALIAN_STATES = [
  { id: 'NSW', name: 'New South Wales' },
  { id: 'VIC', name: 'Victoria' },
  { id: 'QLD', name: 'Queensland' },
  { id: 'WA', name: 'Western Australia' },
  { id: 'SA', name: 'South Australia' },
  { id: 'TAS', name: 'Tasmania' },
  { id: 'ACT', name: 'Australian Capital Territory' },
  { id: 'NT', name: 'Northern Territory' },
];

const CATEGORIES = ['Music', 'Comedy', 'Sports', 'Theatre', 'Workshop', 'Festival'];

function EventsExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize state from URL params
  const [selectedState, setSelectedState] = useState<string>(searchParams.get('state') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const updateUrl = (state: string, cat: string, q: string) => {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (cat) params.append('category', cat);
    if (q) params.append('q', q);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let eventsArray = [];

      if (searchQuery) {
        // Use backend search API
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          eventsArray = data.results?.events || [];
          
          // Apply local filters since search API doesn't take state/category yet
          if (selectedState) {
            eventsArray = eventsArray.filter((e: any) => e.venue?.state === selectedState);
          }
          if (selectedCategory) {
            eventsArray = eventsArray.filter((e: any) => e.category === selectedCategory);
          }
        }
      } else {
        // Use regular explore API with params (default to upcoming events)
        const params = new URLSearchParams();
        params.append('upcoming', 'true');
        if (selectedState) params.append('state', selectedState);
        if (selectedCategory) params.append('category', selectedCategory);
        
        const res = await fetch(`${API_BASE}/events?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          eventsArray = Array.isArray(data) ? data : (data.data || []);
        }
      }
      
      setEvents(eventsArray);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when filters or search change
  useEffect(() => {
    fetchEvents();
    updateUrl(selectedState, selectedCategory, searchQuery);
  }, [selectedState, selectedCategory, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
    updateUrl(selectedState, selectedCategory, searchQuery);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Explore Events</h1>
            <p className="text-gray-500 mt-1">Discover the best events happening across Australia</p>
          </div>
          
          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Search for events, artists..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <button type="submit" className="hidden" />
          </form>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar Filters */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <Filter className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                {(selectedState || selectedCategory) && (
                  <button 
                    onClick={() => { setSelectedState(''); setSelectedCategory(''); setSearchQuery(''); }}
                    className="ml-auto text-xs text-red-500 font-semibold hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* State Filter */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">Australian State</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="state" 
                      checked={selectedState === ''} 
                      onChange={() => setSelectedState('')}
                      className="w-4 h-4 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-gray-600 group-hover:text-gray-900 transition-colors">All Australia</span>
                  </label>
                  {AUSTRALIAN_STATES.map((state) => (
                    <label key={state.id} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="state" 
                        value={state.id}
                        checked={selectedState === state.id} 
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-4 h-4 text-yellow-500 focus:ring-yellow-500 border-gray-300"
                      />
                      <span className="text-gray-600 group-hover:text-gray-900 transition-colors">{state.name} ({state.id})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">Category</h3>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === '' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedCategory === cat 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => <EventCardSkeleton key={`event-skeleton-${i}`} />)}
              </div>
            ) : events.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => {
                  const totalAvailable = event.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
                  const minPrice = event.ticketTypes?.length 
                    ? Math.min(...event.ticketTypes.map((t: any) => t.priceCents || 0)) / 100 
                    : 0;

                  return (
                    <Link href={`/events/${event.slug}`} key={event.id} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                      <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '4/5' }}>
                        <Image 
                          src={getFullImageUrl(event.posterPath)} 
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        {event.category && (
                          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md">
                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">{event.category}</span>
                          </div>
                        )}
                        {/* Seats badge on poster */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-1">
                          {totalAvailable <= 0 ? (
                            <span className="bg-red-600/90 backdrop-blur-sm text-white text-[11px] font-extrabold uppercase px-2 py-1 rounded shadow">
                              Sold Out
                            </span>
                          ) : (
                            <span className="bg-black/75 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded shadow flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${totalAvailable <= 10 ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                              {totalAvailable} / {event.ticketTypes?.reduce((acc: number, t: any) => acc + (t.quantity ?? 0), 0) || 100} Seats
                            </span>
                          )}
                          {minPrice > 0 && (
                            <span className="bg-white/95 backdrop-blur-sm text-slate-900 text-[11px] font-black px-2 py-0.5 rounded shadow">
                              ₹{minPrice}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-yellow-600 transition-colors">
                          {event.title}
                        </h3>
                        
                        <div className="space-y-1.5 mt-auto pt-3">
                          {event.venue && (
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                              <span className="line-clamp-1">{event.venue.name}, {event.venue.city} {event.venue.state}</span>
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                            <span>{(event.startsAt || event.startDate) ? new Date(event.startsAt || event.startDate).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Filter className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-500 max-w-md">
                  We couldn&apos;t find any events matching your selected filters. Try changing the state or category to see more events.
                </p>
                <button 
                  onClick={() => { setSelectedState(''); setSelectedCategory(''); setSearchQuery(''); }}
                  className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function EventsExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center py-20"><Loader2 className="w-10 h-10 text-yellow-500 animate-spin" /></div>}>
      <EventsExploreContent />
    </Suspense>
  );
}
