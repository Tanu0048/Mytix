"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, Filter, Search, Loader2, X, ArrowLeft } from 'lucide-react';
import { EventCardSkeleton } from '@/components/ui/Skeleton';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useLocationStore } from '@/store/useLocationStore';

import { API_BASE, BACKEND_HOST } from '@/config/api';

function getFullImageUrl(path: string | undefined): string {
  if (!path) return '/images/events/et00444235-xycckhvdak-portrait.webp';
  if (path.startsWith('http')) return path;
  return `${BACKEND_HOST}${path}`;
}

function EventsExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { selectedCity, setSelectedCity, availableCities, setAvailableCities, openLocationModal } = useLocationStore();

  const [selectedState, setSelectedState] = useState<string>(searchParams.get('state') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [categories, setCategories] = useState<string[]>([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeFiltersCount = (selectedCategory ? 1 : 0) + (selectedCity !== 'All Cities' ? 1 : 0);

  // Fetch active cities from backend
  useEffect(() => {
    fetch(`${API_BASE}/home`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.cities && Array.isArray(d.cities) && d.cities.length > 0) {
          setAvailableCities(d.cities);
        }
      })
      .catch(() => {});
  }, [setAvailableCities]);

  // Sync city from URL when searchParams change
  useEffect(() => {
    const urlCity = searchParams.get('city');
    const currentCity = useLocationStore.getState().selectedCity;
    if (urlCity) {
      if (urlCity.toLowerCase() !== currentCity.toLowerCase()) {
        setSelectedCity(urlCity);
      }
    } else if (!searchParams.has('city') && currentCity !== 'All Cities') {
      setSelectedCity('All Cities');
    }
  }, [searchParams, setSelectedCity]);

  const updateUrl = (state: string, cat: string, q: string, city: string = selectedCity) => {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (cat) params.append('category', cat);
    if (q) params.append('q', q);
    if (city && city !== 'All Cities') params.append('city', city);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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
          
          if (selectedState) {
            eventsArray = eventsArray.filter((e: any) => e.venue?.state === selectedState);
          }
          if (selectedCategory) {
            eventsArray = eventsArray.filter((e: any) => e.category === selectedCategory);
          }
          if (selectedCity && selectedCity !== 'All Cities') {
            eventsArray = eventsArray.filter((e: any) => e.venue?.city?.toLowerCase() === selectedCity.toLowerCase());
          }
        }
      } else {
        // Use regular explore API with params
        const params = new URLSearchParams();
        params.append('upcoming', 'true');
        if (selectedState) params.append('state', selectedState);
        if (selectedCategory) params.append('category', selectedCategory);
        if (selectedCity && selectedCity !== 'All Cities') params.append('city', selectedCity);
        
        const res = await fetch(`${API_BASE}/events?${params.toString()}`, { cache: 'no-store' });
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

  // Fetch when filters, search or city change
  useEffect(() => {
    fetchEvents();
    updateUrl(selectedState, selectedCategory, searchQuery, selectedCity);
  }, [selectedState, selectedCategory, searchQuery, selectedCity]);

  // Fetch categories once on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_BASE}/categories`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setCategories(Array.isArray(data) ? data : (data.data || []));
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }
    fetchCategories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
    updateUrl(selectedState, selectedCategory, searchQuery, selectedCity);
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              onClick={handleBack}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-500 hover:text-gray-900 mb-2 sm:mb-2.5 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-amber-500 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Explore Events</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Discover the best events happening across Australia</p>
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

        {/* Mobile Filter Chips & Trigger Bar */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar touch-pan-x">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-white shrink-0 shadow-xs cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedCity('All Cities')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
              selectedCity === 'All Cities'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            All Australia
          </button>

          {availableCities.map((city) => (
            <button
              key={`chip-${city}`}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                selectedCity.toLowerCase() === city.toLowerCase()
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {city}
            </button>
          ))}

          {categories.slice(0, 4).map((cat) => (
            <button
              key={`cat-chip-${cat}`}
              onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Mobile Filter Slide-Over Drawer */}
        {isMobileFilterOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-700" />
                  <h3 className="font-extrabold text-base text-gray-900">Filters</h3>
                  {activeFiltersCount > 0 && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      {activeFiltersCount} Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setSelectedCity('All Cities');
                    }}
                    className="text-xs text-red-500 font-bold hover:underline"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Cities */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Concert City</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name="mobCityRadio" 
                        checked={selectedCity === 'All Cities'} 
                        onChange={() => setSelectedCity('All Cities')}
                        className="w-4 h-4 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-sm font-medium text-gray-700">All of Australia</span>
                    </label>
                    {availableCities.map((city) => (
                      <label key={`mob-${city}`} className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="radio" 
                          name="mobCityRadio" 
                          value={city}
                          checked={selectedCity.toLowerCase() === city.toLowerCase()} 
                          onChange={() => setSelectedCity(city)}
                          className="w-4 h-4 text-amber-500 focus:ring-amber-400"
                        />
                        <span className="text-sm font-medium text-gray-700">{city}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Event Category</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        selectedCategory === '' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={`mobcat-${cat}`}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          selectedCategory === cat ? 'bg-amber-400 text-slate-950 font-black' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-md"
                >
                  Apply & See Results
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Desktop Sidebar Filters - Hidden on mobile */}
          <aside className="hidden lg:block w-64 shrink-0 lg:sticky lg:top-20 z-20 self-start">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-700" />
                  <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                </div>
                <button 
                  onClick={() => { 
                    setSelectedState(''); 
                    setSelectedCategory(''); 
                    setSearchQuery(''); 
                    setSelectedCity('All Cities'); 
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer transition-colors"
                >
                  Clear All
                </button>
              </div>

              {/* City / Location Filter Widget */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">City / Location</h3>
                  {selectedCity !== 'All Cities' && (
                    <button
                      onClick={() => setSelectedCity('All Cities')}
                      className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50/40 rounded-xl border border-amber-200/70">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-bold text-gray-900 truncate">{selectedCity}</span>
                  </div>
                  <button
                    onClick={openLocationModal}
                    type="button"
                    className="text-xs text-amber-600 font-bold hover:text-amber-700 hover:underline shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                {selectedCity !== 'All Cities' && (
                  <button
                    onClick={() => setSelectedCity('All Cities')}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Show all cities
                  </button>
                )}
              </div>

              {/* Active Concert Cities Filter */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                    Concert Cities
                  </h3>
                  {availableCities.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {availableCities.length} Active
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="cityFilterRadio" 
                      checked={selectedCity === 'All Cities'} 
                      onChange={() => setSelectedCity('All Cities')}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-gray-600 group-hover:text-gray-900 transition-colors font-medium">All Cities (Australia)</span>
                  </label>
                  {availableCities.map((city) => (
                    <label key={city} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="cityFilterRadio" 
                        value={city}
                        checked={selectedCity.toLowerCase() === city.toLowerCase()} 
                        onChange={() => setSelectedCity(city)}
                        className="w-4 h-4 text-amber-500 focus:ring-amber-400 border-gray-300"
                      />
                      <span className="text-gray-600 group-hover:text-gray-900 transition-colors flex items-center gap-1.5 font-medium">
                        {city}
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </span>
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
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedCategory === '' 
                        ? 'bg-amber-400 text-slate-950 shadow-xs' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat 
                          ? 'bg-amber-400 text-slate-950 shadow-xs' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </aside>

          <div className="flex-1 min-h-125">
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
                  const now = new Date();
                  const startsAt = (event.startsAt || event.startDate) ? new Date(event.startsAt || event.startDate) : null;
                  const isBookingClosed = startsAt ? now >= new Date(startsAt.getTime() - 60 * 60 * 1000) : false;
                  const isSoldOut = totalAvailable <= 0;

                  return (
                    <Link href={`/events/${event.slug}`} key={event.id} className="flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-xs">
                      <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '4/5' }}>
                        <Image 
                          src={getFullImageUrl(event.posterPath)} 
                          alt={event.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        {event.category && (
                          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md">
                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">{event.category}</span>
                          </div>
                        )}
                        {/* Seats badge on poster */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-1">
                          {isBookingClosed ? (
                            <span className="bg-slate-900/90 backdrop-blur-sm text-slate-300 border border-slate-700 text-[11px] font-extrabold uppercase px-2 py-1 rounded shadow">
                              Booking Closed
                            </span>
                          ) : isSoldOut ? (
                            <span className="bg-red-600/90 backdrop-blur-sm text-white text-[11px] font-extrabold uppercase px-2 py-1 rounded shadow">
                              Sold Out
                            </span>
                          ) : (
                            <span className="bg-black/75 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded shadow flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${totalAvailable <= 10 ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                              {totalAvailable} / {event.ticketTypes?.reduce((acc: number, t: any) => acc + (t.quantity ?? 0), 0) || 100} Seats
                            </span>
                          )}
                          {minPrice > 0 && !isBookingClosed && !isSoldOut && (
                            <span className="bg-white/95 backdrop-blur-sm text-slate-900 text-[11px] font-black px-2 py-0.5 rounded shadow">
                              ${minPrice}
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
                  We couldn&apos;t find any events matching your selected filters. Try changing the city or category to see more events.
                </p>
                <button 
                  onClick={() => { setSelectedState(''); setSelectedCategory(''); setSearchQuery(''); setSelectedCity('All Cities'); }}
                  className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors cursor-pointer"
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
