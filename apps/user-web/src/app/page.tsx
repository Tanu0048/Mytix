"use client";

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Menu, ChevronLeft, ChevronRight, MapPin, Calendar, Star, Mic, Music, Radio, Headphones, Guitar, Tag, User } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

const heroSlides = [
  { 
    id: 1, 
    title: 'DILJIT DOSANJH', 
    subtitle: 'DIL-LUMINATI TOUR 2026', 
    label: 'INDIA TOUR',
    image: '/banner/1791267762515_dddelhioct6web.avif', 
    tags: ['Punjabi', 'Concert', 'Stadium', 'Live'] 
  },
  { 
    id: 2, 
    title: 'ARIJIT SINGH', 
    subtitle: 'LIVE IN CONCERT - MUMBAI', 
    label: 'THE SOULFUL EVENING',
    image: '/banner/1790080044017_webrf.avif', 
    tags: ['Bollywood', 'Romantic', 'Sufi'] 
  },
  { 
    id: 3, 
    title: 'COLDPLAY', 
    subtitle: 'MUSIC OF THE SPHERES', 
    label: 'WORLD TOUR',
    image: '/banner/1790674191372_etc3b8s2oiweb.avif', 
    tags: ['Pop', 'Rock', 'International'] 
  }
];

interface HomeData {
  trendingEvents: any[];
  upcomingArtists: any[];
  cities: string[];
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{events: any[], artists: any[], venues: any[]} | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchHomeData() {
      try {
        const res = await fetch('http://localhost:5000/api/v1/home');
        if (res.ok) {
          const data = await res.json();
          setHomeData(data);
        }
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchHomeData();
  }, []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('http://localhost:5000/api/v1/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (e) { console.error('Failed to fetch user:', e); }
    }
    fetchUser();
  }, []);

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

  const nextSlide = () => setCurrentSlide((prev) => prev + 1);
  const prevSlide = () => setCurrentSlide((prev) => prev - 1);

  const trending = homeData?.trendingEvents || [];
  const artists = homeData?.upcomingArtists || [];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">

      {/* Sub Navbar with Icons - Concerts Focused */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
            <Link href="#" className="flex items-center gap-2 px-3 py-3 border-b-2 border-[#f8cb46] text-[#f8cb46]">
              <Mic className="w-4 h-4" /> All Concerts
            </Link>
            <Link href="#" className="flex items-center gap-2 px-3 py-3 border-b-2 border-transparent hover:text-[#f8cb46] hover:border-[#f8cb46] transition-all">
              <Music className="w-4 h-4" /> Bollywood
            </Link>
            <Link href="#" className="flex items-center gap-2 px-3 py-3 border-b-2 border-transparent hover:text-[#f8cb46] hover:border-[#f8cb46] transition-all">
              <Guitar className="w-4 h-4" /> Rock
            </Link>
            <Link href="#" className="flex items-center gap-2 px-3 py-3 border-b-2 border-transparent hover:text-[#f8cb46] hover:border-[#f8cb46] transition-all">
              <Radio className="w-4 h-4" /> EDM & DJ
            </Link>
            <Link href="#" className="flex items-center gap-2 px-3 py-3 border-b-2 border-transparent hover:text-[#f8cb46] hover:border-[#f8cb46] transition-all">
              <Headphones className="w-4 h-4" /> Pop
            </Link>
          </div>
          <div className="flex items-center gap-6 text-xs font-medium text-gray-600">
            <Link href="#" className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
              <Tag className="w-3.5 h-3.5" /> Fan Offers
            </Link>
            <Link href="#" className="hover:text-gray-900 transition-colors">VIP Bookings</Link>
            <Link href="#" className="hover:text-gray-900 transition-colors">List Your Gig</Link>
          </div>
        </div>
      </div>

      {/* Hero Carousel (Infinite Center Mode like BookMyShow) */}
      <div className="relative w-full h-40 sm:h-56 md:h-80 lg:h-96 flex justify-center items-center overflow-hidden bg-gray-100 py-4">
        {[...heroSlides, ...heroSlides].map((slide, index) => {
          const total = 6;
          let diff = index - currentSlide;
          let offset = diff % total;
          if (offset < -2) offset += total;
          if (offset > 3) offset -= total;

          const isVisible = Math.abs(offset) <= 1;

          return (
            <div 
              key={`${slide.id}-${index}`}
              className="absolute w-11/12 max-w-7xl h-full transition-all duration-700 ease-in-out px-2"
              style={{ 
                transform: `translateX(${offset * 100}%)`,
                zIndex: offset === 0 ? 10 : 0,
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none'
              }}
            >
              <div className="relative w-full h-full rounded-xl md:rounded-2xl overflow-hidden shadow-md cursor-pointer">
                <Image 
                  src={slide.image} 
                  alt={slide.title} 
                  fill
                  priority={index === 0 || index === 1 || index === 5}
                  className="object-cover"
                />
              </div>
            </div>
          );
        })}

        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-20 w-8 h-10 md:w-10 md:h-14 bg-black/60 hover:bg-black/90 backdrop-blur text-white flex items-center justify-center rounded opacity-80 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 md:w-8 md:h-8" />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-20 w-8 h-10 md:w-10 md:h-14 bg-black/60 hover:bg-black/90 backdrop-blur text-white flex items-center justify-center rounded opacity-80 transition-all cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 md:w-8 md:h-8" />
        </button>

        {/* Indicators */}
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroSlides.map((_, index) => {
            let activeDot = currentSlide % heroSlides.length;
            if (activeDot < 0) activeDot += heroSlides.length;
            return (
              <button 
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all cursor-pointer ${index === activeDot ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Trending Concerts (Vertical Cards) */}
      <div className="max-w-7xl mx-auto px-4 mt-16 mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Trending Events Near You</h2>
          <Link href="#" className="text-sm font-semibold text-[#f8cb46] hover:text-[#e5b830] flex items-center group">
            View All <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {(trending.length > 0 ? trending : [1, 2, 3, 4, 5]).map((item, i) => {
            const fallbackImages = [
              '/images/events/et00444235-xycckhvdak-portrait.webp',
              '/images/events/et00477911-leqzyrmedu-portrait.webp',
              '/images/events/et00507337-uhvekqvrcs-portrait.webp',
              '/images/events/et00507738-kfbeunsutt-portrait.webp',
              '/images/events/et00512226-ahnwsmsljv-portrait.webp'
            ];
            const isReal = typeof item === 'object';
            const fallbackTitles = ['The Vyxan', 'Drishyam: The Conclusion', 'Doraemon: Nobita', 'Hanuman Ansh', 'Prem Ki Kahani'];
            const fallbackSlugs = ['the-vyxan', 'drishyam-the-conclusion', 'doraemon-nobita', 'hanuman-ansh', 'prem-ki-kahani'];
            const title = isReal ? item.title : fallbackTitles[i % 5];
            const sub = isReal ? `${item.venue?.city || 'Location'} • ${item.venue?.name || 'Venue'}` : ['Action • PVR Cinemas', 'Thriller • Inox', 'Animation • Cinepolis', 'Devotional • PVR Cinemas', 'Romance • Inox'][i % 5];
            const img = isReal && item.posterPath ? item.posterPath : fallbackImages[i % fallbackImages.length];
            const price = isReal && item.ticketTypes?.[0] ? `From ₹${item.ticketTypes[0].priceCents / 100}` : 'Hot';

            return (
              <Link href={`/events/${isReal ? item.slug : fallbackSlugs[i % 5]}`} key={isReal ? item.id : i} className="flex flex-col cursor-pointer group">
                <div className="relative aspect-3/4 rounded-xl overflow-hidden mb-3 shadow-md group-hover:shadow-xl transition-all duration-300">
                  <Image 
                    src={img} 
                    alt={title} 
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {price}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 leading-tight mb-1 truncate group-hover:text-[#f8cb46] transition-colors">
                  {title}
                </h3>
                <p className="text-xs text-gray-500 font-medium truncate">
                  {sub}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Top International Artists (Horizontal Cards) */}
      <div className="max-w-7xl mx-auto px-4 mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Top International Artists</h2>
          <Link href="#" className="text-sm font-semibold text-[#f8cb46] hover:text-[#e5b830] flex items-center group">
            View All <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(artists.length > 0 ? artists : [1, 2, 3]).map((item, i) => {
            const isReal = typeof item === 'object';
            const name = isReal ? item.name : 'Coldplay: Music of the Spheres';
            const img = isReal && item.imagePath ? item.imagePath : `https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1200&auto=format&fit=crop`;

            return (
              <div key={isReal ? item.id : `artist-${i}`} className="flex flex-col cursor-pointer group">
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 shadow-md group-hover:shadow-xl transition-all duration-300">
                  <Image 
                    src={img} 
                    alt={name} 
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1 group-hover:text-[#f8cb46] transition-colors">
                  {name}
                </h3>
                <div className="flex flex-col gap-1 text-xs text-gray-500 font-medium mb-3">
                  <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-400" /> {isReal ? 'Top Artist' : 'International Act'}</div>
                  {!isReal && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> DY Patil Stadium, Mumbai</div>}
                </div>
                <div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full border border-gray-200">
                    {isReal ? 'Artist' : 'Live Concert'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
