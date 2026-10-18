"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Check, Globe, Navigation, MapPin } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useLocationStore } from '@/store/useLocationStore';
import { toast } from 'sonner';

const CITY_STATES: Record<string, string> = {
  'melbourne': 'Victoria',
  'sydney': 'New South Wales',
  'brisbane': 'Queensland',
  'perth': 'Western Australia',
  'adelaide': 'South Australia',
  'gold coast': 'Queensland',
  'canberra': 'ACT',
  'hobart': 'Tasmania',
  'darwin': 'Northern Territory',
  'newcastle': 'New South Wales',
  'geelong': 'Victoria'
};

export default function LocationModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { 
    selectedCity, 
    setSelectedCity, 
    availableCities, 
    isLocationModalOpen, 
    closeLocationModal 
  } = useLocationStore();

  const [search, setSearch] = useState('');
  const [detecting, setDetecting] = useState(false);

  // Close on ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLocationModal();
    }
    if (isLocationModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isLocationModalOpen, closeLocationModal]);

  // Live cities from backend with active events
  const liveCitiesList = useMemo(() => {
    return availableCities.map((city) => ({
      name: city,
      state: CITY_STATES[city.toLowerCase()] || 'Australia',
      hasLiveEvents: true
    }));
  }, [availableCities]);

  // Filtered search list - only cities where concerts exist
  const searchResults = useMemo(() => {
    if (!search.trim()) return liveCitiesList;
    const q = search.toLowerCase().trim();

    return liveCitiesList.filter(c => 
      c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
    );
  }, [liveCitiesList, search]);

  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName);
    toast.success(cityName === 'All Cities' ? 'Location set to All of Australia' : `Location set to ${cityName}`);
    closeLocationModal();

    if (pathname === '/events') {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
      if (cityName === 'All Cities') {
        params.delete('city');
      } else {
        params.set('city', cityName);
      }
      const qs = params.toString();
      router.replace(qs ? `/events?${qs}` : '/events');
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location service not supported');
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          if (res.ok) {
            const data = await res.json();
            const detected = data.address?.city || data.address?.town || data.address?.state;
            const match = liveCitiesList.find(c => detected && c.name.toLowerCase().includes(detected.toLowerCase()));
            if (match) {
              handleSelectCity(match.name);
            } else if (detected) {
              handleSelectCity(detected);
            } else {
              handleSelectCity('All Cities');
            }
          } else {
            handleSelectCity('All Cities');
          }
        } catch {
          handleSelectCity('All Cities');
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setDetecting(false);
        toast.error('Location permission denied');
      },
      { timeout: 7000 }
    );
  };

  if (!isLocationModalOpen) return null;

  const isAllCitiesSelected = selectedCity === 'All Cities';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Subtle Glassmorphic Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity" 
        onClick={closeLocationModal} 
      />

      {/* Minimal Card Container */}
      <div 
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.18)] border border-slate-100 w-full max-w-md overflow-hidden z-10 flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Select Location
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose your city to explore local events
            </p>
          </div>
          <button 
            onClick={closeLocationModal}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Search Input with 'Near me' Action */}
        <div className="px-6 pb-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-all font-medium"
            />
            {/* Auto-detect GPS button integrated on right */}
            <button
              onClick={handleDetectLocation}
              disabled={detecting}
              title="Use current location"
              className="absolute right-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-amber-700 bg-white hover:bg-amber-50/50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Navigation className={`w-3 h-3 text-amber-500 ${detecting ? 'animate-spin' : ''}`} />
              <span className="text-[11px]">{detecting ? 'Locating…' : 'Near me'}</span>
            </button>
          </div>
        </div>

        {/* Location List */}
        <div className="px-3 py-2 max-h-[50vh] overflow-y-auto space-y-1">
          {/* Option: All Cities (Australia) */}
          {!search && (
            <button
              onClick={() => handleSelectCity('All Cities')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer group text-left ${
                isAllCitiesSelected
                  ? 'bg-slate-950 text-white shadow-xs ring-1 ring-amber-400/40'
                  : 'hover:bg-amber-50/40 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  isAllCitiesSelected
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-amber-100/70 group-hover:text-amber-700'
                }`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${isAllCitiesSelected ? 'text-white' : 'text-slate-900'}`}>
                    All of Australia
                  </div>
                  <div className={`text-[11px] ${isAllCitiesSelected ? 'text-amber-200/70' : 'text-slate-400'}`}>
                    Nationwide events & tours
                  </div>
                </div>
              </div>
              
              {isAllCitiesSelected && (
                <Check className="w-4 h-4 text-amber-400 shrink-0 mr-1" />
              )}
            </button>
          )}

          {/* Section Divider */}
          {!search && liveCitiesList.length > 0 && (
            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Active Locations
              </span>
            </div>
          )}

          {/* Live Cities Rows */}
          {searchResults.map((city) => {
            const isSelected = selectedCity.toLowerCase() === city.name.toLowerCase();

            return (
              <button
                key={city.name}
                onClick={() => handleSelectCity(city.name)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer group text-left ${
                  isSelected
                    ? 'bg-slate-950 text-white shadow-xs ring-1 ring-amber-400/40'
                    : 'hover:bg-amber-50/40 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-amber-400/20 text-amber-300'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-amber-100/70 group-hover:text-amber-700'
                  }`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {city.name}
                      </span>
                      {city.hasLiveEvents && (
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-amber-300' : 'bg-emerald-500'
                        } animate-pulse`} />
                      )}
                    </div>
                    <div className={`text-[11px] ${isSelected ? 'text-amber-200/70' : 'text-slate-400'}`}>
                      {city.state}
                      {city.hasLiveEvents && ' • Live shows'}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mr-1" />
                )}
              </button>
            );
          })}

          {/* Empty search fallback */}
          {searchResults.length === 0 && (
            <div className="py-8 text-center px-4">
              <p className="text-xs text-slate-400">
                No active events in &quot;{search}&quot;
              </p>
              <button
                onClick={() => handleSelectCity('All Cities')}
                className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
              >
                Browse all of Australia →
              </button>
            </div>
          )}
        </div>

        {/* Clean, Minimalist Subtle Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Current: <strong className="text-slate-700 font-semibold">{selectedCity}</strong></span>
          {!isAllCitiesSelected && (
            <button
              onClick={() => handleSelectCity('All Cities')}
              className="text-amber-600 hover:text-amber-700 font-semibold hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
