"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, MapPin, User, LogOut, Ticket, ShoppingCart, X, Check, Globe } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocationStore } from '@/store/useLocationStore';
import { API_BASE, BACKEND_HOST } from '@/config/api';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, fetchUser, logout, loading, setUser } = useAuthStore();
  const { selectedCity, setSelectedCity, availableCities, setAvailableCities, initialize: initLocation } = useLocationStore();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const locationRef = useRef<HTMLDivElement>(null);
  const mobileLocationRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<{events: any[], artists: any[], venues: any[]} | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeHolds, setActiveHolds] = useState<any[]>([]);

  useEffect(() => {
    fetchUser();
    initLocation();

    // Fetch active cities from backend
    fetch(`${API_BASE}/home`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.cities && Array.isArray(d.cities) && d.cities.length > 0) {
          setAvailableCities(d.cities);
        }
      })
      .catch(() => {});
  }, [fetchUser, initLocation, setAvailableCities]);

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setIsLocationOpen(false);
    setCitySearch('');
    toast.success(city === 'All Cities' ? 'Location set to All of Australia' : `Location set to ${city}`);

    if (pathname === '/events') {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
      if (city === 'All Cities') {
        params.delete('city');
      } else {
        params.set('city', city);
      }
      const qs = params.toString();
      router.replace(qs ? `/events?${qs}` : '/events');
    }
  };

  useEffect(() => {
    if (!user) {
      setActiveHolds([]);
      return;
    }
    async function fetchHolds() {
      try {
        const res = await fetch(`${API_BASE}/holds`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setActiveHolds(data.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchHolds();
    // Poll every 30 seconds to keep cart up to date
    const interval = setInterval(fetchHolds, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (
        locationRef.current && !locationRef.current.contains(event.target as Node) &&
        (!mobileLocationRef.current || !mobileLocationRef.current.contains(event.target as Node))
      ) {
        setIsLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
        
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } catch (e) { console.warn('Search error:', e); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Don't show navbar on auth page
  if (pathname === '/auth') return null;

  // Only show cities that actually have concerts/venues
  const allUniqueCities = Array.from(new Set(availableCities || [])).filter(Boolean);
  const filteredCities = citySearch.trim()
    ? allUniqueCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
    : allUniqueCities;

  return (
    <>
      <nav className="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-50 text-gray-800 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/" className="text-2xl font-black tracking-tight cursor-pointer text-gray-900 flex items-center">
              Myt<span className="text-yellow-500">ix</span>
            </Link>
            
            <Link href="/events" className="hidden lg:block text-sm font-semibold text-gray-600 hover:text-black transition-colors">
              Explore Events
            </Link>
            
            {/* Desktop Location Dropdown */}
            <div className="relative" ref={locationRef}>
              <button 
                onClick={() => {
                  setIsLocationOpen(prev => !prev);
                  setIsUserMenuOpen(false);
                }}
                type="button"
                className={`hidden md:flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl transition-all border text-sm font-semibold ${
                  isLocationOpen 
                    ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/20 shadow-xs' 
                    : 'text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border-gray-200'
                }`}
              >
                <MapPin className="w-4 h-4 text-yellow-500 shrink-0" />
                <span className="text-sm font-semibold truncate max-w-30">
                  {selectedCity === 'All Cities' ? 'All Australia' : selectedCity}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isLocationOpen ? 'rotate-180 text-yellow-600' : ''}`} />
              </button>

              {/* Desktop In-Place Dropdown Menu */}
              {isLocationOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Search inside Dropdown */}
                  <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search city..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Cities List */}
                  <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                    {!citySearch && (
                      <button
                        onClick={() => handleSelectCity('All Cities')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          selectedCity === 'All Cities'
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-slate-600" />
                          <span>All of Australia</span>
                        </div>
                        {selectedCity === 'All Cities' && <Check className="w-3.5 h-3.5 text-slate-950" />}
                      </button>
                    )}

                    {filteredCities.map((city) => {
                      const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
                      const hasLiveEvents = (availableCities || []).some(
                        (ac) => ac.toLowerCase() === city.toLowerCase()
                      );

                      return (
                        <button
                          key={city}
                          onClick={() => handleSelectCity(city)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                            <span>{city}</span>
                            {hasLiveEvents && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live shows available" />
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-slate-950" />}
                        </button>
                      );
                    })}

                    {filteredCities.length === 0 && (
                      <div className="py-4 text-center text-xs text-slate-400">
                        No city matching &quot;{citySearch}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        <div className="flex-1 max-w-2xl hidden md:block relative">
          <div className={`flex items-center w-full transition-all duration-200 ${isSearchOpen ? 'bg-white rounded-full border-2 border-yellow-400 ring-2 ring-yellow-400/20 px-4 py-2' : 'bg-gray-100 hover:bg-gray-50 rounded-lg px-4 py-2 border border-gray-200'}`}>
            <Search className={`w-5 h-5 mr-3 ${isSearchOpen ? 'text-yellow-500' : 'text-gray-400'}`} />
            <input 
              type="text" 
              placeholder="Search for Artists, Concerts, Tours and Music Festivals..."
              className="w-full bg-transparent border-none outline-none text-base placeholder:text-gray-400 text-gray-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  setIsSearchOpen(false);
                  router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
            />
            {isSearchOpen && searchQuery && (
              <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearchQuery('')} 
                className="bg-gray-200 hover:bg-gray-300 rounded-full p-1 ml-2 transition-colors cursor-pointer shrink-0 text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Live Search Dropdown */}
          {isSearchOpen && searchResults && (
            <div 
              className="absolute top-full mt-3 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {(searchResults.events?.length > 0 || searchResults.artists?.length > 0) ? (
                  <>
                    {[...(searchResults.events || []), ...(searchResults.artists || [])].map((item: any) => (
                      <Link 
                        key={`${item.id || item.slug}`} 
                        href={item.title ? `/events/${item.slug}` : `/events?search=${encodeURIComponent(item.name || '')}`} 
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-lg shrink-0 relative overflow-hidden shadow-xs border border-gray-200">
                          {(item.posterPath || item.imagePath) && (
                            <Image 
                              src={(item.posterPath || item.imagePath).startsWith('http') ? (item.posterPath || item.imagePath) : `${BACKEND_HOST}${(item.posterPath || item.imagePath)}`} 
                              alt={item.title || item.name} 
                              fill 
                              className="object-cover" 
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base text-gray-900 font-semibold truncate group-hover:text-yellow-600 transition-colors">{item.title || item.name}</div>
                          <div className="text-sm text-gray-500 truncate">
                            {item.title ? (
                              <>{item.venue?.city || 'Location'} · from ${((item.ticketTypes?.[0]?.priceCents || 49900) / 100).toFixed(0)}</>
                            ) : (
                              'Artist'
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </>
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500">No results found for &quot;{searchQuery}&quot;</div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-100 text-center bg-gray-50/50">
                <Link 
                  href={`/search?q=${searchQuery}`} 
                  onClick={() => setIsSearchOpen(false)}
                  className="text-blue-600 font-medium hover:underline text-sm inline-block"
                >
                  View all results for &quot;{searchQuery}&quot; →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {activeHolds.length > 0 && (
            <Link 
              href={`/checkout?holdId=${activeHolds[0].holdId}`}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                {activeHolds.length}
              </span>
            </Link>
          )}

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <div 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full font-semibold text-sm cursor-pointer border border-yellow-200 hover:bg-yellow-100 transition-colors"
              >
                <User className="w-4 h-4" />
                {user.name.split(' ')[0]}
              </div>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 transform origin-top-right transition-all">
                  <div className="px-4 py-4 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                    {user.email && <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>}
                  </div>
                  <div className="p-2 space-y-0.5">
                    <Link 
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-semibold text-gray-800 hover:text-yellow-700 hover:bg-yellow-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-amber-500 shrink-0" />
                      My Profile
                    </Link>
                    <Link 
                      href="/tickets"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-semibold text-gray-800 hover:text-yellow-700 hover:bg-yellow-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Ticket className="w-4 h-4 text-amber-500 shrink-0" />
                      My Tickets
                    </Link>
                  </div>
                  <div className="p-2 border-t border-gray-100">
                    <button 
                      onClick={async () => {
                        await logout();
                        setIsUserMenuOpen(false);
                        toast.success('Logged out successfully');
                        router.push('/');
                      }}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="bg-yellow-400 text-black text-xs font-bold px-5 py-2 rounded-full hover:bg-yellow-500 transition-colors">
              Login / Sign Up
            </Link>
          )}
          {/* Mobile Location Button & Dropdown */}
          <div className="relative md:hidden" ref={mobileLocationRef}>
            <button
              onClick={() => {
                setIsLocationOpen(prev => !prev);
                setIsUserMenuOpen(false);
              }}
              type="button"
              className="flex items-center gap-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              <span className="truncate max-w-18.75">
                {selectedCity === 'All Cities' ? 'All Australia' : selectedCity}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </button>

            {isLocationOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                  <button
                    onClick={() => handleSelectCity('All Cities')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                      selectedCity === 'All Cities' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>All of Australia</span>
                    {selectedCity === 'All Cities' && <Check className="w-3.5 h-3.5 text-slate-950" />}
                  </button>
                  {allUniqueCities.map((city) => {
                    const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
                    return (
                      <button
                        key={`m-${city}`}
                        onClick={() => handleSelectCity(city)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                          isSelected ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{city}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-slate-950" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
