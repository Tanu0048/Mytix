"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Menu, MapPin, User, LogOut, Ticket, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, fetchUser, logout, loading } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<{events: any[], artists: any[], venues: any[]} | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeHolds, setActiveHolds] = useState<any[]>([]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!user) {
      setActiveHolds([]);
      return;
    }
    async function fetchHolds() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/holds`, {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search?q=${encodeURIComponent(searchQuery)}`);
        
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } catch (e) { console.error('Search error:', e); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Don't show navbar on auth page
  if (pathname === '/auth') return null;

  return (
    <nav className="bg-white/95 backdrop-blur-md px-4 py-3 border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-extrabold tracking-tight cursor-pointer">
            Mytix
          </Link>
          
          <Link href="/events" className="hidden lg:block text-sm font-bold text-gray-700 hover:text-yellow-600 transition-colors">
            Explore Events
          </Link>
          
          <div className="hidden md:flex items-center gap-1.5 cursor-pointer text-gray-700 hover:text-yellow-600 bg-gray-100 px-3 py-1.5 rounded-md transition-colors">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Sydney</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 max-w-2xl hidden md:block relative">
          <div className={`flex items-center w-full transition-all duration-200 ${isSearchOpen ? 'bg-gray-50 rounded-full border-2 border-blue-500 px-4 py-2' : 'bg-gray-100/80 hover:bg-gray-200/60 rounded-xl border-2 border-transparent px-4 py-2'}`}>
            <Search className={`w-5 h-5 mr-3 ${isSearchOpen ? 'text-gray-700' : 'text-gray-500'}`} />
            <input 
              type="text" 
              placeholder="Search for Artists, Concerts, Tours and Music Festivals..."
              className={`w-full bg-transparent border-none outline-none text-base placeholder:text-gray-500 ${isSearchOpen ? 'text-gray-900' : 'text-gray-800'}`}
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
                className="bg-gray-200 hover:bg-gray-300 rounded-full p-1 ml-2 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            )}
          </div>

          {/* Live Search Dropdown */}
          {isSearchOpen && searchResults && (
            <div 
              className="absolute top-full mt-3 w-full bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {(searchResults.events?.length > 0 || searchResults.artists?.length > 0) ? (
                  <>
                    {[...(searchResults.events || []), ...(searchResults.artists || [])].map((item: any) => (
                      <Link 
                        key={`${item.id || item.slug}`} 
                        href={item.title ? `/events/${item.slug}` : `/artists/${item.slug}`} 
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                      >
                        <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0 relative overflow-hidden shadow-sm border border-gray-100 group-hover:border-blue-200 transition-colors">
                          {(item.posterPath || item.imagePath) && (
                            <Image 
                              src={(item.posterPath || item.imagePath).startsWith('http') ? (item.posterPath || item.imagePath) : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}${(item.posterPath || item.imagePath)}`} 
                              alt={item.title || item.name} 
                              fill 
                              className="object-cover" 
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base text-gray-900 truncate">{item.title || item.name}</div>
                          <div className="text-sm text-gray-500 truncate">
                            {item.title ? (
                              <>{item.venue?.city || 'Location'} · from ₹{((item.ticketTypes?.[0]?.priceCents || 49900) / 100).toFixed(0)}</>
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
                  <div className="p-2">
                    <Link 
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-colors"
                    >
                      <User className="w-4 h-4 shrink-0" />
                      My Profile
                    </Link>
                    <Link 
                      href="/tickets"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-colors"
                    >
                      <Ticket className="w-4 h-4 shrink-0" />
                      My Tickets
                    </Link>
                  </div>
                  <div className="p-2 border-t border-gray-50">
                    <button 
                      onClick={async () => {
                        await logout();
                        setIsUserMenuOpen(false);
                        toast.success('Logged out successfully');
                        router.push('/');
                      }}
                      className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="bg-yellow-400 text-black text-xs font-bold px-5 py-2 rounded hover:bg-yellow-500 transition-colors">
              Login / Sign Up
            </Link>
          )}
          <Menu className="w-6 h-6 text-gray-700 cursor-pointer" />
        </div>
      </div>
    </nav>
  );
}
