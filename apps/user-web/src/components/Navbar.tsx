"use client";

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Menu, MapPin, User } from 'lucide-react';
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
  const [searchResults, setSearchResults] = useState<{events: any[], artists: any[], venues: any[]} | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/v1/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (e) { console.error('Search error:', e); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Don't show navbar on auth page
  if (pathname === '/auth') return null;

  return (
    <nav className="bg-white px-4 py-3 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-extrabold tracking-tight cursor-pointer">
            Mytix
          </Link>
          
          <div className="hidden md:flex items-center gap-1.5 cursor-pointer text-gray-700 hover:text-yellow-600 bg-gray-100 px-3 py-1.5 rounded-md transition-colors">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Delhi</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 max-w-2xl hidden md:block relative">
          <div className="flex items-center bg-gray-100 rounded-md px-3 py-2 w-full focus-within:bg-white focus-within:ring-1 focus-within:ring-yellow-400 border border-transparent focus-within:border-yellow-400 transition-all">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search for Artists, Concerts, Tours and Music Festivals..."
              className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
            />
          </div>

          {/* Live Search Dropdown */}
          {isSearchOpen && searchResults && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
              {searchResults.events?.length > 0 && (
                <div className="p-3 border-b">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">Events</div>
                  {searchResults.events.map(event => (
                    <Link key={event.id} href={`/events/${event.slug}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md">
                      <div className="w-10 h-10 bg-gray-200 rounded shrink-0 relative overflow-hidden">
                        {event.posterPath && <Image src={event.posterPath} alt={event.title} fill className="object-cover" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{event.title}</div>
                        <div className="text-xs text-gray-500">{event.venue?.city}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {searchResults.artists?.length > 0 && (
                <div className="p-3 border-b">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">Artists</div>
                  {searchResults.artists.map(artist => (
                    <Link key={artist.id} href={`/artists/${artist.slug}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md">
                      <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0 relative overflow-hidden">
                        {artist.imagePath && <Image src={artist.imagePath} alt={artist.name} fill className="object-cover" />}
                      </div>
                      <div className="text-sm font-medium text-gray-900">{artist.name}</div>
                    </Link>
                  ))}
                </div>
              )}
              {searchResults.events?.length === 0 && searchResults.artists?.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">No results found for "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <div 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full font-semibold text-sm cursor-pointer border border-yellow-200 hover:bg-yellow-100 transition-colors"
              >
                <User className="w-4 h-4" />
                {user.name.split(' ')[0]}
              </div>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border py-1 z-50">
                  <Link 
                    href="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    My Profile
                  </Link>
                  <button 
                    onClick={async () => {
                      await logout();
                      setIsUserMenuOpen(false);
                      toast.success('Logged out successfully');
                      router.push('/');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Log out
                  </button>
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
