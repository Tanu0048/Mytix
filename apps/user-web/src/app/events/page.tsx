"use client";

import React, { useState, useEffect } from 'react';
import { Search, Loader2, X, ArrowLeft, Check, SlidersHorizontal } from 'lucide-react';
import { EventCardSkeleton } from '@/components/ui/Skeleton';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useLocationStore } from '@/store/useLocationStore';

import { API_BASE } from '@/config/api';
import EventCard from '@/components/ui/EventCard';

function EventsExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { selectedCity, setSelectedCity, availableCities, setAvailableCities } = useLocationStore();

  const [selectedState, setSelectedState] = useState<string>(searchParams.get('state') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [categories, setCategories] = useState<string[]>([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

  const clearAll = () => {
    setSelectedState('');
    setSelectedCategory('');
    setSearchQuery('');
    setSelectedCity('All Cities');
  };

  // The backend can return the same city in different cases ("sydney" / "Sydney")
  const cityOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return (availableCities || []).filter((c) => {
      const key = c.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [availableCities]);

  const hasFilters = !!(selectedCategory || searchQuery || selectedCity !== 'All Cities');
  const activeFiltersCount = (selectedCategory ? 1 : 0) + (selectedCity !== 'All Cities' ? 1 : 0);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const cityList = (
    <div className="space-y-0.5">
      <CityOption label="All of Australia" active={selectedCity === 'All Cities'} onClick={() => setSelectedCity('All Cities')} />
      {cityOptions.map((city) => (
        <CityOption
          key={`city-${city}`}
          label={city}
          active={selectedCity.toLowerCase() === city.toLowerCase()}
          onClick={() => setSelectedCity(city)}
        />
      ))}
    </div>
  );

  const categoryList = (
    <div className="flex flex-wrap gap-2">
      <Chip active={!selectedCategory} onClick={() => setSelectedCategory('')}>All</Chip>
      {categories.map((cat) => (
        <Chip key={`cat-${cat}`} active={selectedCategory === cat} onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}>
          {cat}
        </Chip>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-brand-50/70 via-white to-white py-6 sm:py-10">
      <div className="container-page">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              onClick={handleBack}
              type="button"
              className="group mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-ink cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>
            <h1 className="text-3xl font-extrabold sm:text-4xl">
              {selectedCity !== 'All Cities' ? `Events in ${selectedCity}` : 'Explore events'}
            </h1>
            <p className="mt-1.5 text-slate-500" aria-live="polite">
              {loading ? 'Finding shows…' : `${events.length} upcoming ${events.length === 1 ? 'show' : 'shows'}${selectedCategory ? ` in ${selectedCategory}` : ''}`}
            </p>
          </div>

          <form onSubmit={handleSearch} role="search" className="relative w-full md:w-96">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search events, artists…"
              aria-label="Search events"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-10 text-sm text-ink placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-400/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-ink cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        {/* Mobile: filter button + quick city chips */}
        <div className="-mx-4 mb-6 flex items-center gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar lg:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 text-xs font-semibold text-ink cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-400 text-[10px] font-bold text-ink">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <Chip active={selectedCity === 'All Cities'} onClick={() => setSelectedCity('All Cities')}>All of Australia</Chip>
          {cityOptions.map((city) => (
            <Chip key={`m-${city}`} active={selectedCity.toLowerCase() === city.toLowerCase()} onClick={() => setSelectedCity(city)}>
              {city}
            </Chip>
          ))}
        </div>

        {/* Mobile filter drawer */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-xs lg:hidden" onClick={() => setIsMobileFilterOpen(false)}>
            <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-pop" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h2 className="text-base font-bold">Filters</h2>
                <div className="flex items-center gap-3">
                  {hasFilters && (
                    <button onClick={clearAll} className="text-xs font-semibold text-slate-500 hover:text-ink cursor-pointer">
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setIsMobileFilterOpen(false)} aria-label="Close filters" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-8 overflow-y-auto p-5">
                <FilterGroup title="City">{cityList}</FilterGroup>
                <FilterGroup title="Category">{categoryList}</FilterGroup>
              </div>
              <div className="border-t border-slate-100 p-4">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="h-12 w-full rounded-full bg-brand-400 text-sm font-semibold text-ink hover:bg-brand-300 cursor-pointer"
                >
                  Show {events.length} {events.length === 1 ? 'result' : 'results'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-start gap-8 lg:flex-row lg:gap-10">

          {/* Desktop sidebar */}
          <aside className="hidden w-60 shrink-0 self-start lg:sticky lg:top-24 lg:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-bold">Filters</h2>
                {hasFilters && (
                  <button onClick={clearAll} className="text-xs font-semibold text-slate-500 hover:text-ink hover:underline cursor-pointer">
                    Clear all
                  </button>
                )}
              </div>
              <div className="space-y-7">
                <FilterGroup title="City">{cityList}</FilterGroup>
                <FilterGroup title="Category">{categoryList}</FilterGroup>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="min-h-125 w-full flex-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3">
                {Array(6).fill(0).map((_, i) => <EventCardSkeleton key={`event-skeleton-${i}`} />)}
              </div>
            ) : events.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3">
                {events.map((event, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    priority={i < 3}
                    sizes="(max-width: 1280px) 50vw, 33vw"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
                  <Search className="h-6 w-6 text-brand-600" />
                </div>
                <h2 className="text-xl font-bold">No events found</h2>
                <p className="mt-2 max-w-md text-slate-500">
                  Nothing matches these filters. Try another city or category.
                </p>
                {hasFilters && (
                  <button
                    onClick={clearAll}
                    className="mt-6 h-11 rounded-full bg-brand-400 px-6 text-sm font-semibold text-ink transition-colors hover:bg-brand-300 cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function CityOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer ${
        active ? 'bg-brand-50 font-semibold text-ink' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
      }`}
    >
      <span className="truncate">{label}</span>
      {active && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
        active ? 'bg-brand-400 text-ink' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export default function EventsExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-slate-400 animate-spin" /></div>}>
      <EventsExploreContent />
    </Suspense>
  );
}
