"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, MapPin, User, LogOut, Ticket, ShoppingCart, X, Check, Globe, Receipt, Menu, Compass } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
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

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [pathname]);

  // Don't show navbar on auth page
  if (pathname === '/auth') return null;

  // Only show cities that actually have concerts/venues
  // De-dupe case-insensitively ("sydney" + "Sydney" → one entry), title-case and sort A–Z.
  // City filtering elsewhere compares lowercase, so the display spelling is safe to normalise.
  const toTitleCase = (s: string) => s.trim().toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
  const allUniqueCities = Array.from(
    new Map(
      (availableCities || [])
        .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
        .map((c) => [c.trim().toLowerCase(), toTitleCase(c)] as const)
    ).values()
  ).sort((a, b) => a.localeCompare(b));
  const filteredCities = citySearch.trim()
    ? allUniqueCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
    : allUniqueCities;

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 text-slate-800 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-2 sm:gap-4 md:gap-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="flex items-center shrink-0 py-1">
              <Image 
                src="/mytix-logo.png" 
                alt="Mytix" 
                width={125} 
                height={40} 
                priority 
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </Link>
            
            <Link href="/events" className={`hidden lg:block text-sm font-semibold transition-colors ${pathname?.startsWith('/events') ? 'text-ink underline decoration-brand-400 decoration-2 underline-offset-[6px]' : 'text-slate-500 hover:text-ink'}`}>
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
                className={`hidden md:flex h-10 items-center gap-1.5 cursor-pointer px-3.5 rounded-full transition-colors border text-sm font-semibold ${
                  isLocationOpen
                    ? 'bg-brand-50 text-ink border-brand-300'
                    : 'text-slate-700 hover:text-ink bg-white hover:border-brand-300 hover:bg-brand-50 border-slate-200'
                }`}
              >
                <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="text-sm font-semibold truncate max-w-30">
                  {selectedCity === 'All Cities' ? 'All Australia' : selectedCity}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isLocationOpen ? 'rotate-180 text-ink' : ''}`} />
              </button>

              {/* Desktop In-Place Dropdown Menu */}
              {isLocationOpen && (
                <div
                  role="listbox"
                  aria-label="Choose location"
                  onKeyDown={(e) => { if (e.key === 'Escape') setIsLocationOpen(false); }}
                  className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-pop border border-slate-200 z-50 overflow-hidden"
                >
                  {/* Header + search */}
                  <div className="px-3 pt-3 pb-2.5 border-b border-slate-100">
                    <p className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Choose location
                    </p>
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search city"
                        aria-label="Search city"
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        autoFocus
                        className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none transition-colors focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25 text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Cities List */}
                  <div className="max-h-72 overflow-y-auto p-1.5">
                    {!citySearch && (
                      <>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedCity === 'All Cities'}
                          onClick={() => handleSelectCity('All Cities')}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                            selectedCity === 'All Cities'
                              ? 'bg-brand-50 text-ink font-semibold'
                              : 'text-slate-700 font-medium hover:bg-slate-50'
                          }`}
                        >
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selectedCity === 'All Cities' ? 'bg-brand-400 text-ink' : 'bg-slate-100 text-slate-500'}`}>
                            <Globe className="w-3.5 h-3.5" />
                          </span>
                          <span className="flex-1 text-left">All of Australia</span>
                          {selectedCity === 'All Cities' && <Check className="w-4 h-4 text-brand-600" />}
                        </button>
                        {allUniqueCities.length > 0 && (
                          <p className="px-2.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Cities
                          </p>
                        )}
                      </>
                    )}

                    {filteredCities.map((city) => {
                      const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          key={city}
                          onClick={() => handleSelectCity(city)}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-brand-50 text-ink font-semibold'
                              : 'text-slate-700 font-medium hover:bg-slate-50'
                          }`}
                        >
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isSelected ? 'bg-brand-400 text-ink' : 'bg-slate-100 text-slate-500'}`}>
                            <MapPin className="w-3.5 h-3.5" />
                          </span>
                          <span className="flex-1 text-left truncate">{city}</span>
                          {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                        </button>
                      );
                    })}

                    {filteredCities.length === 0 && (
                      <div className="px-4 py-6 text-center">
                        <MapPin className="w-5 h-5 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No cities found</p>
                        <p className="text-xs text-slate-400 mt-0.5">Try a different spelling</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Desktop Search */}
        <div className="flex-1 max-w-2xl hidden md:block relative">
          <div className={`flex h-10 items-center w-full rounded-full px-4 border transition-colors duration-200 ${isSearchOpen ? 'bg-white border-brand-400 ring-4 ring-brand-400/25' : 'bg-slate-100 border-transparent hover:bg-brand-50 hover:border-brand-200'}`}>
            <Search className={`w-4 h-4 mr-2.5 shrink-0 ${isSearchOpen ? 'text-brand-600' : 'text-slate-400'}`} />
            <input 
              type="text" 
              placeholder="Search events, artists and venues"
              aria-label="Search events"
              className="w-full bg-transparent border-none outline-none text-sm placeholder:text-slate-500 text-ink"
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
                aria-label="Clear search"
                className="bg-slate-200 hover:bg-slate-300 rounded-full p-0.5 ml-2 transition-colors cursor-pointer shrink-0 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop Live Search Dropdown */}
          {isSearchOpen && searchResults && (
            <div 
              className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-pop border border-slate-200 overflow-hidden z-50"
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
                        className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group"
                      >
                        <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 relative overflow-hidden shadow-xs border border-slate-200">
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
                          <div className="text-base text-ink font-semibold truncate group-hover:text-brand-700 transition-colors">{item.title || item.name}</div>
                          <div className="text-sm text-slate-500 truncate">
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
                  <div className="p-6 text-center text-sm text-slate-500">No results found for &quot;{searchQuery}&quot;</div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 text-center bg-slate-50/50">
                <Link 
                  href={`/search?q=${searchQuery}`} 
                  onClick={() => setIsSearchOpen(false)}
                  className="text-ink font-semibold hover:underline underline-offset-4 text-sm inline-block"
                >
                  View all results for &quot;{searchQuery}&quot; →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Section Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(prev => !prev);
              setIsMobileMenuOpen(false);
            }}
            aria-label="Toggle search"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
          >
            {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {/* Mobile Location Selector Button */}
          <div className="relative md:hidden" ref={mobileLocationRef}>
            <button
              onClick={() => {
                setIsLocationOpen(prev => !prev);
                setIsMobileMenuOpen(false);
              }}
              type="button"
              className="flex h-9 items-center gap-1 text-xs font-semibold bg-white hover:border-slate-300 text-slate-800 px-3 rounded-full border border-slate-200 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="truncate max-w-16">
                {selectedCity === 'All Cities' ? 'Australia' : selectedCity}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {isLocationOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-pop border border-slate-200 z-50 overflow-hidden">
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Choose location
                </p>
                <div className="max-h-72 overflow-y-auto p-1.5">
                  {['All Cities', ...allUniqueCities].map((city) => {
                    const isAll = city === 'All Cities';
                    const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
                    const Icon = isAll ? Globe : MapPin;
                    return (
                      <button
                        type="button"
                        key={`m-${city}`}
                        onClick={() => handleSelectCity(city)}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                          isSelected ? 'bg-brand-50 text-ink font-semibold' : 'text-slate-700 font-medium hover:bg-slate-50'
                        }`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isSelected ? 'bg-brand-400 text-ink' : 'bg-slate-100 text-slate-500'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="flex-1 text-left truncate">{isAll ? 'All of Australia' : city}</span>
                        {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {activeHolds.length > 0 && (
            <Link 
              href={`/checkout?holdId=${activeHolds[0].holdId}`}
              aria-label={`Continue checkout (${activeHolds.length} held)`}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-ink hover:bg-slate-200 transition-colors"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-brand-400 text-[9px] sm:text-[10px] font-bold text-ink border-2 border-white">
                {activeHolds.length}
              </span>
            </Link>
          )}

          {/* Desktop User Menu */}
          {user ? (
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                className="flex h-10 items-center gap-2 pl-1 pr-3 rounded-full font-semibold text-sm cursor-pointer border border-slate-200 hover:border-slate-300 bg-white text-ink transition-colors"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-400 text-xs font-bold text-ink">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                {user.name.split(' ')[0]}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isUserMenuOpen && (
                <div role="menu"
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-pop border border-slate-200 overflow-hidden z-50 origin-top-right">
                  <div className="px-4 py-4 border-b border-slate-50 bg-slate-50/50">
                    <p className="text-sm font-bold text-ink truncate">{user.name}</p>
                    {user.email && <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>}
                  </div>
                  <div className="p-2 space-y-0.5">
                    <Link 
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      My Profile
                    </Link>
                    <Link 
                      href="/tickets"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Ticket className="w-4 h-4 text-slate-400 shrink-0" />
                      My Tickets
                    </Link>
                    <Link 
                      href="/orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Receipt className="w-4 h-4 text-slate-400 shrink-0" />
                      My Orders & Invoices
                    </Link>
                  </div>
                  <div className="p-2 border-t border-slate-100">
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
            <Link href="/auth" className="hidden md:inline-flex h-10 items-center bg-brand-400 text-ink text-sm font-semibold px-5 rounded-full hover:bg-brand-300 shadow-sm shadow-brand-400/30 transition-colors">
              Sign in
            </Link>
          )}

          {/* Mobile Hamburger Drawer Trigger */}
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(prev => !prev);
              setIsMobileSearchOpen(false);
              setIsLocationOpen(false);
            }}
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 text-ink transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Mobile Search Bar */}
      {isMobileSearchOpen && (
        <div className="md:hidden px-4 pt-2 pb-3 border-t border-slate-100 bg-white">
          <div className="flex h-11 items-center bg-slate-100 rounded-full px-4">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search events, artists and venues"
              aria-label="Search events"
              className="w-full bg-transparent border-none outline-none text-sm text-ink placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  setIsMobileSearchOpen(false);
                  router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Live Search Dropdown */}
          {searchResults && (
            <div className="mt-2 bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-y-auto p-1">
              {(searchResults.events?.length > 0 || searchResults.artists?.length > 0) ? (
                <>
                  {[...(searchResults.events || []), ...(searchResults.artists || [])].map((item: any) => (
                    <Link
                      key={`mob-${item.id || item.slug}`}
                      href={item.title ? `/events/${item.slug}` : `/events?search=${encodeURIComponent(item.name || '')}`}
                      onClick={() => setIsMobileSearchOpen(false)}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg text-left"
                    >
                      <div className="w-9 h-9 bg-slate-100 rounded-md shrink-0 relative overflow-hidden">
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
                        <p className="text-xs font-bold text-ink truncate">{item.title || item.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.title ? (item.venue?.city || 'Australia') : 'Artist'}
                        </p>
                      </div>
                    </Link>
                  ))}
                  <div className="p-2 text-center border-t border-slate-100">
                    <Link
                      href={`/search?q=${searchQuery}`}
                      onClick={() => setIsMobileSearchOpen(false)}
                      className="text-xs font-semibold text-ink"
                    >
                      View all results →
                    </Link>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">No events found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 bg-slate-900/40 backdrop-blur-xs z-40 animate-in fade-in duration-150">
          <div className="bg-white border-b border-slate-200 p-4 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            {/* User Details / Auth Card */}
            {user ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-400 text-ink font-bold flex items-center justify-center text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email || 'Registered Attendee'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-brand-400 text-ink flex items-center justify-between">
                <div>
                  <p className="text-sm font-black">Welcome to Mytix</p>
                  <p className="text-xs font-medium text-slate-800">Sign in to book tickets & save seats</p>
                </div>
                <Link
                  href="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-2 bg-ink text-white rounded-full text-xs font-semibold"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-1">
              <Link
                href="/events"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Compass className="w-4 h-4 text-slate-400" />
                Explore Events
              </Link>

              {user && (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    My Profile
                  </Link>

                  <Link
                    href="/tickets"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <Ticket className="w-4 h-4 text-slate-400" />
                    My Tickets & QR Codes
                  </Link>

                  <Link
                    href="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <Receipt className="w-4 h-4 text-slate-400" />
                    My Orders & Invoices
                  </Link>
                </>
              )}
            </div>

            {/* Logout button */}
            {user && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setIsMobileMenuOpen(false);
                    toast.success('Logged out successfully');
                    router.push('/');
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
    </>
  );
}
