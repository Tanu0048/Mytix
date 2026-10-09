"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, MapPin, Calendar, Music, Building2, X } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function getFullImageUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BACKEND_URL}${path}`;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [results, setResults] = useState<{ events: any[]; artists: any[]; venues: any[] }>({
    events: [],
    artists: [],
    venues: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'artists' | 'venues'>('all');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || { events: [], artists: [], venues: [] });
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on initial load if query exists
  useEffect(() => {
    if (initialQuery) {
      fetchResults(initialQuery);
    }
  }, [initialQuery, fetchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setQuery(inputValue);
    router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`, { scroll: false });
    fetchResults(inputValue);
  };

  const totalResults = results.events.length + results.artists.length + results.venues.length;

  const tabs = [
    { key: 'all', label: 'All', count: totalResults },
    { key: 'events', label: 'Events', count: results.events.length },
    { key: 'artists', label: 'Artists', count: results.artists.length },
    { key: 'venues', label: 'Venues', count: results.venues.length },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {query ? (
              <>Search results for <span className="text-blue-600">&quot;{query}&quot;</span></>
            ) : (
              'Search Events, Artists & Venues'
            )}
          </h1>
          {hasSearched && !loading && (
            <p className="text-sm text-gray-500 mb-4">
              {totalResults} result{totalResults !== 1 ? 's' : ''} found
            </p>
          )}

          {/* Tabs */}
          {hasSearched && !loading && totalResults > 0 && (
            <div className="flex gap-1 border-b border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors relative ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 flex gap-4 animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && hasSearched && totalResults === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Search className="w-9 h-9 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No results found</h2>
            <p className="text-gray-500 mb-6">
              We couldn&apos;t find anything for &quot;<strong>{query}</strong>&quot;. Try different keywords.
            </p>
            <div className="flex flex-wrap gap-2 justify-center text-sm">
              {['Concerts', 'Bollywood', 'Delhi', 'Stand-up Comedy'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInputValue(suggestion);
                    setQuery(suggestion);
                    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
                    fetchResults(suggestion);
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state before search */}
        {!loading && !hasSearched && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Search className="w-9 h-9 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Start searching</h2>
            <p className="text-gray-500">Search for events, artists, concerts, or venues above.</p>
          </div>
        )}

        {/* Results Content */}
        {!loading && hasSearched && totalResults > 0 && (
          <div className="space-y-10">

            {/* Events Section */}
            {(activeTab === 'all' || activeTab === 'events') && results.events.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Events
                    <span className="text-sm font-normal text-gray-400">({results.events.length})</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.events.map((event: any) => {
                    const minPrice = event.ticketTypes?.length > 0
                      ? Math.min(...event.ticketTypes.map((t: any) => t.priceCents))
                      : null;
                    return (
                      <Link
                        key={event.id}
                        href={`/events/${event.slug}`}
                        className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group"
                      >
                        <div className="relative aspect-video bg-gray-100 overflow-hidden">
                          {event.posterPath ? (
                            <Image
                              src={getFullImageUrl(event.posterPath)}
                              alt={event.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Calendar className="w-10 h-10 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className="text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded-full">
                              {event.category || 'Event'}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 text-base line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                            {event.title}
                          </h3>
                          {event.venue && (
                            <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              {event.venue.name}, {event.venue.city}
                            </p>
                          )}
                          {event.startsAt && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              {new Date(event.startsAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </p>
                          )}
                          {minPrice !== null && (
                            <p className="mt-3 text-sm font-bold text-blue-700">
                              From ₹{(minPrice / 100).toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Artists Section */}
            {(activeTab === 'all' || activeTab === 'artists') && results.artists.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
                  <Music className="w-5 h-5 text-purple-500" />
                  Artists
                  <span className="text-sm font-normal text-gray-400">({results.artists.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.artists.map((artist: any) => (
                    <div
                      key={artist.id}
                      className="bg-white rounded-2xl p-4 text-center border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all group cursor-pointer"
                    >
                      <div className="w-16 h-16  from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden relative border-2 border-white shadow-md">
                        {artist.imagePath ? (
                          <Image
                            src={getFullImageUrl(artist.imagePath)}
                            alt={artist.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Music className="w-7 h-7 text-purple-400" />
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm group-hover:text-purple-600 transition-colors">
                        {artist.name}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Venues Section */}
            {(activeTab === 'all' || activeTab === 'venues') && results.venues.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
                  <Building2 className="w-5 h-5 text-green-500" />
                  Venues
                  <span className="text-sm font-normal text-gray-400">({results.venues.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {results.venues.map((venue: any) => (
                    <div
                      key={venue.id}
                      className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100 hover:border-green-200 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
                        <Building2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{venue.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {venue.city}{venue.state ? `, ${venue.state}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading search...</div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
