"use client";

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Menu, ChevronLeft, ChevronRight, MapPin, Calendar, Star, Mic, Music, Radio, Headphones, Guitar, Tag, User } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BannerSkeleton, EventCardSkeleton, EventListRowSkeleton } from '@/components/ui/Skeleton';

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
  featuredEvents?: any[];
  trendingEvents: any[];
  upcomingArtists: any[];
  cities: string[];
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{events: any[], artists: any[], venues: any[]} | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const fetchBanners = async () => {
    try {
      const bannerRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/banners`);
      if (bannerRes.ok) {
        const bannerData = await bannerRes.json();
        setBanners(bannerData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    }
  };

  useEffect(() => {
    async function fetchHomeData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/home`);
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
    
    // Initial fetch
    fetchHomeData();
    fetchBanners();

    // Supabase Realtime Subscription for Live Updates
    const bannerChannel = supabase
      .channel('banners-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, (payload) => {
        console.log('Realtime change received:', payload);
        fetchBanners(); // Refetch the updated list automatically
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bannerChannel);
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
          setSearchResults(data);
        }
      } catch (e) { console.error('Search error:', e); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const nextSlide = () => setCurrentSlide((prev) => prev + 1);
  const prevSlide = () => setCurrentSlide((prev) => prev - 1);

  const trending = [...(homeData?.featuredEvents || []), ...(homeData?.trendingEvents || [])];
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
        {banners.length > 0 ? (
          <>
            {[...banners, ...banners].map((slide, index) => {
              const total = banners.length * 2;
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
                      src={slide.imageUrl || '/banner/placeholder.avif'} 
                      alt={slide.title || 'Banner'} 
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
              {banners.map((_, index) => {
                let activeDot = currentSlide % banners.length;
                if (activeDot < 0) activeDot += banners.length;
                return (
                  <button 
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${index === activeDot ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BannerSkeleton />
          </div>
        )}
      </div>

      {/* Featured events */}
      <div className="max-w-7xl mx-auto px-4 mt-16 mb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight">Featured events</h2>
            <p className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mt-1">Don&apos;t miss these top events</p>
          </div>
          <Link href="/events" className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center group">
            See all <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => <EventCardSkeleton key={i} />)
          ) : trending.slice(0, 4).map((item: any, i: number) => {
            const title = item.title;
            const sub = `${item.venue?.city || 'Location'} • ${item.venue?.name || 'Venue'}`;
            const img = item.posterPath || '/banner/placeholder.avif';
            const totalAvailable = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
            const totalQuantity = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.quantity ?? 0), 0) ?? 0;
            const minPrice = item.ticketTypes?.length 
              ? Math.min(...item.ticketTypes.map((t: any) => t.priceCents || 0)) / 100 
              : 0;

            return (
              <div key={item.id} className="flex flex-col group">
                <Link href={`/events/${item.slug}`} className="relative aspect-square md:aspect-4/5 rounded-xl overflow-hidden mb-3 shadow-md group-hover:shadow-xl transition-all duration-300 block">
                  <Image src={img} alt={title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md text-blue-700 text-[10px] uppercase font-black px-2 py-1 rounded">
                    Featured
                  </div>
                  {/* Seats badge on poster */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-1">
                    {totalAvailable <= 0 ? (
                      <span className="bg-red-600/90 backdrop-blur-sm text-white text-[11px] font-extrabold uppercase px-2 py-1 rounded shadow">
                        Sold Out
                      </span>
                    ) : (
                      <span className="bg-black/75 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded shadow flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${totalAvailable <= 10 ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                        {totalAvailable} / {totalQuantity || 100} Seats
                      </span>
                    )}
                    {minPrice > 0 && (
                      <span className="bg-white/95 backdrop-blur-sm text-slate-900 text-[11px] font-black px-2 py-1 rounded shadow">
                        ₹{minPrice}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex flex-col flex-1">
                  <p className="text-xs text-gray-500 font-semibold mb-1 truncate flex items-center gap-1"><MapPin className="w-3 h-3"/> {sub}</p>
                  <Link href={`/events/${item.slug}`} className="font-bold text-gray-900 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {title}
                  </Link>
                  <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-400">
                      {new Date(item.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <Link href={`/events/${item.slug}`} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center">
                      Get tickets <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Browse by category */}
      <div className="w-full bg-linear-to-b from-blue-50/60 to-white py-16 mb-16 border-y border-blue-100/30">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight mb-2">Browse by category</h2>
          <p className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">Find what you love</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Concerts', icon: <Music className="w-5 h-5" /> },
              { name: 'Comedy', icon: <Mic className="w-5 h-5" /> },
              { name: 'Classical', icon: <Radio className="w-5 h-5" /> },
              { name: 'Theatre', icon: <Star className="w-5 h-5" /> },
              { name: 'Sports', icon: <Star className="w-5 h-5" /> },
              { name: 'Art & Exhibitions', icon: <User className="w-5 h-5" /> },
              { name: 'Festivals', icon: <Tag className="w-5 h-5" /> },
              { name: 'Family & Kids', icon: <Headphones className="w-5 h-5" /> },
            ].map((cat, i) => (
              <Link key={i} href="#" className="flex items-center justify-between bg-white px-4 py-4 rounded-xl border border-blue-100/50 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {cat.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{cat.name}</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* On sale now */}
      <div className="max-w-7xl mx-auto px-4 mb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight">On sale now</h2>
            <p className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mt-1">Tickets are flying fast</p>
          </div>
          <Link href="/events" className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center group">
            See all <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => <EventCardSkeleton key={`sale-skeleton-${i}`} />)
          ) : trending.slice(0, 4).map((item: any, i: number) => {
            const title = item.title;
            const sub = `${item.venue?.city || 'Location'} • ${item.venue?.name || 'Venue'}`;
            const img = item.posterPath || '/banner/placeholder.avif';
            const totalAvailable = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
            const totalQuantity = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.quantity ?? 0), 0) ?? 0;
            const minPrice = item.ticketTypes?.length 
              ? Math.min(...item.ticketTypes.map((t: any) => t.priceCents || 0)) / 100 
              : 0;

            return (
              <div key={`sale-${item.id}`} className="flex flex-col group">
                <Link href={`/events/${item.slug}`} className="relative aspect-square md:aspect-4/5 rounded-xl overflow-hidden mb-3 shadow-md group-hover:shadow-xl transition-all duration-300 block">
                  <Image src={img} alt={title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] uppercase font-black px-2 py-1 rounded">
                    On Sale
                  </div>
                  {/* Seats badge on poster */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-1">
                    {totalAvailable <= 0 ? (
                      <span className="bg-red-600/90 backdrop-blur-sm text-white text-[11px] font-extrabold uppercase px-2 py-1 rounded shadow">
                        Sold Out
                      </span>
                    ) : (
                      <span className="bg-black/75 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded shadow flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${totalAvailable <= 10 ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                        {totalAvailable} / {totalQuantity || 100} Seats
                      </span>
                    )}
                    {minPrice > 0 && (
                      <span className="bg-white/95 backdrop-blur-sm text-slate-900 text-[11px] font-black px-2 py-0.5 rounded shadow">
                        ₹{minPrice}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex flex-col flex-1">
                  <p className="text-xs text-gray-500 font-semibold mb-1 truncate flex items-center gap-1"><MapPin className="w-3 h-3"/> {sub}</p>
                  <Link href={`/events/${item.slug}`} className="font-bold text-gray-900 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {title}
                  </Link>
                  <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-400">
                      {new Date(item.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <Link href={`/events/${item.slug}`} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center">
                      Get tickets <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Browse by city */}
      <div className="max-w-7xl mx-auto px-4 mb-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight mb-2">Browse by city</h2>
        <p className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">Find events near you</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Hobart'].map((city, i) => (
             <Link key={i} href="#" className="relative overflow-hidden flex items-center justify-between bg-white px-5 py-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
                <div className="relative z-10">
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors">{city}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1 group-hover:text-blue-500">Upcoming events <ChevronRight className="inline w-3 h-3" /></p>
                </div>
                <MapPin className="absolute -right-2.5 -bottom-2.5 w-24 h-24 text-gray-50/80 group-hover:text-blue-50/80 transition-colors transform -rotate-12" />
             </Link>
          ))}
        </div>
      </div>

      {/* Coming up list */}
      <div className="max-w-7xl mx-auto px-4 mb-20">
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight">Coming up</h2>
            <p className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mt-1">Plan your next outing</p>
          </div>
          <Link href="/events" className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center group">
            See all <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {loading ? (
            Array(6).fill(0).map((_, i) => <EventListRowSkeleton key={`coming-skeleton-${i}`} />)
          ) : trending.slice(0, 6).map((item: any, i: number) => {
            const dateObj = new Date(item.startsAt);
            const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
            const day = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
            return (
              <Link key={`coming-${item.id}`} href={`/events/${item.slug}`} className="flex items-center gap-4 py-3 border-b border-gray-50 hover:bg-gray-50/80 transition-colors px-2 rounded-lg group">
                <div className="flex flex-col items-center justify-center min-w-15">
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">{month}</span>
                  <span className="text-2xl font-black text-gray-900">{day}</span>
                </div>
                <div className="w-14 h-14 rounded-lg overflow-hidden relative shrink-0">
                  <Image src={item.posterPath || '/banner/placeholder.avif'} alt={item.title} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-bold text-gray-900 text-sm md:text-base truncate group-hover:text-blue-600 transition-colors">{item.title}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{item.venue?.name}</p>
                </div>
                <div className="hidden sm:block">
                   <span className="text-xs font-bold text-gray-900 bg-gray-100 px-4 py-2.5 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">Get tickets</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Footer Features */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <h2 className="text-xl md:text-2xl font-extrabold text-[#111827] tracking-tight mb-8">Simple, and handled by real people</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { title: "No hidden fees", desc: "What you see is what you pay. No surprises at checkout." },
            { title: "Secure booking", desc: "Your data is protected with the highest security standards." },
            { title: "24/7 Support", desc: "Our local team is always ready to help you with anything." },
            { title: "Refund guarantee", desc: "Changed your mind? Cancel for a full refund up to 24h before." }
          ].map((feat, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                   <Star className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">{feat.desc}</p>
             </div>
          ))}
        </div>

        {/* Let's Talk CTA */}
        <div className="bg-[#2a2422] rounded-3xl p-8 md:p-12 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
          <div className="relative z-10 max-w-lg mb-6 md:mb-0">
             <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-[#f8f5f2]">Putting on a show? Let&apos;s talk.</h2>
             <p className="text-[#d8d0ca] text-sm md:text-base font-medium leading-relaxed">Join thousands of creators using our platform to sell tickets, manage events, and grow their audience.</p>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full md:w-auto">
             <Link href="#" className="bg-white text-black px-6 py-3.5 rounded-full font-bold text-sm text-center hover:bg-gray-100 transition-colors">Start selling</Link>
             <Link href="#" className="bg-transparent border border-white/20 text-white px-6 py-3.5 rounded-full font-bold text-sm text-center hover:bg-white/10 transition-colors">Contact sales</Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}
