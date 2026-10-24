"use client";

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Menu, ChevronLeft, ChevronRight, MapPin, Calendar, Star, Mic, Music, Radio, Headphones, Guitar, Tag, User, ArrowRight, Laugh, Flame, Trophy, Drama, Palette, Sparkles, Clock, Ticket, HelpCircle, MessageCircle, Globe, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BannerSkeleton, EventCardSkeleton, EventListRowSkeleton } from '@/components/ui/Skeleton';
import { useLocationStore } from '@/store/useLocationStore';
import SafeImage from '@/components/SafeImage';

import { API_BASE } from '@/config/api';

const FAQS = [
  {
    question: "How do I receive and access my tickets after booking?",
    answer: "All tickets on Mytix are 100% digital and paperless. Once your payment is confirmed, your verified QR e-tickets are instantly generated and available in your 'My Tickets' dashboard. You will also receive an email with your booking confirmation and PDF e-ticket with a live scannable QR code."
  },
  {
    question: "How does entry verification work at the venue gates?",
    answer: "Simply open your e-ticket on your mobile phone via Mytix or your confirmation email at the turnstile gate. The event turnstile scanners verify the cryptographic digital signature of your QR code in under a second for fast, fraud-proof admission. No printouts needed!"
  },
  {
    question: "Can I transfer or cancel my tickets if my plans change?",
    answer: "Yes! Depending on the organizer's refund and transfer policy for the show, you can transfer your tickets to a friend's email or request a cancellation directly from your profile dashboard up to 24 hours before the event starts."
  },
  {
    question: "What happens if an event is postponed or cancelled?",
    answer: "If an event is rescheduled, your original tickets remain 100% valid for the new date automatically. If a show is cancelled or you cannot make the rescheduled date, a full refund is automatically issued to your original payment method within 5–7 business days."
  },
  {
    question: "What payment methods are supported on Mytix?",
    answer: "We support all major payment options: UPI (Google Pay, PhonePe, Paytm), Credit & Debit cards (Visa, Mastercard, RuPay, American Express), and Net Banking via safe, bank-grade 256-bit SSL encrypted gateways with instant payment confirmation."
  },
  {
    question: "Are there any hidden charges or unexpected fees at checkout?",
    answer: "Never! Mytix guarantees zero surprise fees. The ticket price shown on the event page clearly itemizes any applicable taxes or booking charges upfront before you proceed to payment."
  }
];

const categoryConfigs: Record<string, {
  name: string;
  subtitle: string;
  badge: string;
  count: string;
  icon: any;
  image: string;
  accentColor: string;
  accentBadge: string;
  accentGlow: string;
  accentGradient: string;
  glowColor: string;
  colorDot: string;
}> = {
  concert: {
    name: 'Concerts',
    subtitle: 'Stadium tours & live gigs',
    badge: 'Live Music',
    count: '32+ Shows',
    icon: Mic,
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-amber-400',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(245,158,11,0.35)]',
    accentGradient: 'from-amber-500/30 to-transparent',
    glowColor: 'bg-amber-500',
    colorDot: 'bg-amber-400'
  },
  music: {
    name: 'Concerts & Gigs',
    subtitle: 'Stadium tours & live gigs',
    badge: 'Live Music',
    count: '32+ Shows',
    icon: Mic,
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-amber-400',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(245,158,11,0.35)]',
    accentGradient: 'from-amber-500/30 to-transparent',
    glowColor: 'bg-amber-500',
    colorDot: 'bg-amber-400'
  },
  comedy: {
    name: 'Standup Comedy',
    subtitle: 'Solo specials & comedy club tours',
    badge: 'Trending',
    count: '18+ Shows',
    icon: Laugh,
    image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-orange-400',
    accentBadge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(249,115,22,0.35)]',
    accentGradient: 'from-orange-500/30 to-transparent',
    glowColor: 'bg-orange-500',
    colorDot: 'bg-orange-400'
  },
  standup: {
    name: 'Standup Comedy',
    subtitle: 'Solo specials & comedy club tours',
    badge: 'Trending',
    count: '18+ Shows',
    icon: Laugh,
    image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-orange-400',
    accentBadge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(249,115,22,0.35)]',
    accentGradient: 'from-orange-500/30 to-transparent',
    glowColor: 'bg-orange-500',
    colorDot: 'bg-orange-400'
  },
  festival: {
    name: 'Music Festivals',
    subtitle: 'Open-air multi-day vibes & camping',
    badge: 'Festivals',
    count: '14+ Events',
    icon: Flame,
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-pink-500',
    accentBadge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(236,72,153,0.35)]',
    accentGradient: 'from-pink-500/30 to-transparent',
    glowColor: 'bg-pink-500',
    colorDot: 'bg-pink-400'
  },
  festivals: {
    name: 'Music Festivals',
    subtitle: 'Open-air multi-day vibes & camping',
    badge: 'Festivals',
    count: '14+ Events',
    icon: Flame,
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-pink-500',
    accentBadge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(236,72,153,0.35)]',
    accentGradient: 'from-pink-500/30 to-transparent',
    glowColor: 'bg-pink-500',
    colorDot: 'bg-pink-400'
  },
  sports: {
    name: 'Live Sports',
    subtitle: 'Stadium rivalries & cup leagues',
    badge: 'Matchday',
    count: '24+ Matches',
    icon: Trophy,
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-emerald-400',
    accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(16,185,129,0.35)]',
    accentGradient: 'from-emerald-500/30 to-transparent',
    glowColor: 'bg-emerald-500',
    colorDot: 'bg-emerald-400'
  },
  sport: {
    name: 'Live Sports',
    subtitle: 'Stadium rivalries & cup leagues',
    badge: 'Matchday',
    count: '24+ Matches',
    icon: Trophy,
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-emerald-400',
    accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(16,185,129,0.35)]',
    accentGradient: 'from-emerald-500/30 to-transparent',
    glowColor: 'bg-emerald-500',
    colorDot: 'bg-emerald-400'
  },
  theatre: {
    name: 'Theatre & Plays',
    subtitle: 'Broadway musicals & drama',
    badge: 'Stage Art',
    count: '16+ Plays',
    icon: Drama,
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-purple-400',
    accentBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(168,85,247,0.35)]',
    accentGradient: 'from-purple-500/30 to-transparent',
    glowColor: 'bg-purple-500',
    colorDot: 'bg-purple-400'
  },
  theater: {
    name: 'Theatre & Plays',
    subtitle: 'Broadway musicals & drama',
    badge: 'Stage Art',
    count: '16+ Plays',
    icon: Drama,
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-purple-400',
    accentBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(168,85,247,0.35)]',
    accentGradient: 'from-purple-500/30 to-transparent',
    glowColor: 'bg-purple-500',
    colorDot: 'bg-purple-400'
  },
  workshop: {
    name: 'Workshops',
    subtitle: 'Creative arts & masterclasses',
    badge: 'Hands-on',
    count: '20+ Sessions',
    icon: Palette,
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-cyan-400',
    accentBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(6,182,212,0.35)]',
    accentGradient: 'from-cyan-500/30 to-transparent',
    glowColor: 'bg-cyan-500',
    colorDot: 'bg-cyan-400'
  },
  workshops: {
    name: 'Workshops',
    subtitle: 'Creative arts & masterclasses',
    badge: 'Hands-on',
    count: '20+ Sessions',
    icon: Palette,
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-cyan-400',
    accentBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(6,182,212,0.35)]',
    accentGradient: 'from-cyan-500/30 to-transparent',
    glowColor: 'bg-cyan-500',
    colorDot: 'bg-cyan-400'
  }
};

const getCategoryMeta = (cat: any) => {
  const catName = typeof cat === 'string' ? cat : ((cat as any)?.name || 'Events');
  const key = String(catName).toLowerCase().trim();
  if (categoryConfigs[key]) return categoryConfigs[key];
  return {
    name: catName,
    subtitle: 'Explore live events & tickets',
    badge: 'Curated',
    count: 'Live Now',
    icon: Sparkles,
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
    accentColor: 'border-slate-800/80 hover:border-amber-400',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentGlow: 'hover:shadow-[0_20px_45px_-10px_rgba(245,158,11,0.35)]',
    accentGradient: 'from-amber-500/30 to-transparent',
    glowColor: 'bg-amber-500',
    colorDot: 'bg-amber-400'
  };
};

const CITY_STATES: Record<string, string> = {
  melbourne: 'Victoria',
  sydney: 'New South Wales',
  brisbane: 'Queensland',
  perth: 'Western Australia',
  adelaide: 'South Australia',
  'gold coast': 'Queensland',
  canberra: 'ACT',
  hobart: 'Tasmania',
  darwin: 'Northern Territory',
  newcastle: 'New South Wales',
  geelong: 'Victoria'
};

const DEFAULT_CITY_IMAGE = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80';

interface HomeData {
  featuredEvents?: any[];
  trendingEvents: any[];
  upcomingArtists: any[];
  cities: string[];
  cityImages?: Record<string, string>;
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{events: any[], artists: any[], venues: any[]} | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>(['Concert', 'Comedy', 'Festival', 'Sports', 'Theatre', 'Workshop']);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('All');
  const [comingUpFilter, setComingUpFilter] = useState<'All' | 'Weekend' | 'Month'>('All');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqData, setFaqData] = useState<{ heading: string; subheading: string; items: { question: string; answer: string }[] }>({
    heading: "Frequently Asked Questions",
    subheading: "Everything you need to know about booking, instant digital QR tickets, venue gate entry, and refunds.",
    items: FAQS
  });
  
  const { selectedCity, setSelectedCity, setAvailableCities, availableCities } = useLocationStore();

  useEffect(() => {
    async function loadFaq() {
      try {
        const res = await fetch(`${API_BASE}/faq`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.items) && json.items.length > 0) {
            setFaqData({
              heading: json.heading || "Frequently Asked Questions",
              subheading: json.subheading || "Everything you need to know about booking, instant digital QR tickets, venue gate entry, and refunds.",
              items: json.items
            });
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic faq, using fallback:", err);
      }
    }
    loadFaq();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const fetchBanners = async () => {
    try {
      const bannerRes = await fetch(`${API_BASE}/banners`);
      if (bannerRes.ok) {
        const bannerData = await bannerRes.json();
        setBanners(bannerData.data || []);
      }
    } catch (error) {
      console.warn('Failed to fetch banners:', error);
    }
  };

  useEffect(() => {
    async function fetchHomeData() {
      try {
        const res = await fetch(`${API_BASE}/home`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setHomeData(data);
          if (data.cities && Array.isArray(data.cities)) {
            setAvailableCities(data.cities);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch home data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setCategories(data);
          } else if (data && Array.isArray(data.data)) {
            setCategories(data.data);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch categories:', err);
      }
    };

    // Initial fetch
    fetchHomeData();
    fetchBanners();
    fetchCategories();

    // Supabase Realtime Subscription for Live Banners Updates
    const bannerChannel = supabase
      .channel('banners-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, (payload) => {
        console.log('Realtime banner change received:', payload);
        fetchBanners(); // Refetch the updated list automatically
      })
      .subscribe();

    // Supabase Realtime Subscription for Live Categories Updates
    const categoryChannel = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
        console.log('Realtime category change received:', payload);
        fetchCategories(); // Refetch the updated categories automatically
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bannerChannel);
      supabase.removeChannel(categoryChannel);
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
          setSearchResults(data);
        }
      } catch (e) { console.warn('Search error:', e); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const nextSlide = () => setCurrentSlide((prev) => prev + 1);
  const prevSlide = () => setCurrentSlide((prev) => prev - 1);

  const allTrending = React.useMemo(() => {
    const rawList = [
      ...(homeData?.featuredEvents || []),
      ...(homeData?.trendingEvents || [])
    ];
    const seen = new Set<string>();
    const unique: any[] = [];
    const now = Date.now();

    for (const item of rawList) {
      if (!item) continue;
      const key = String(item.id || item.slug || '');
      if (!key || seen.has(key)) continue;

      const startsAt = item.startsAt || item.startDate;
      if (!startsAt || new Date(startsAt).getTime() <= now) continue;

      seen.add(key);
      unique.push(item);
    }
    return unique;
  }, [homeData]);

  const cityFiltered = selectedCity && selectedCity !== 'All Cities'
    ? allTrending.filter((item: any) => item.venue?.city?.toLowerCase() === selectedCity.toLowerCase())
    : allTrending;
  const trending = cityFiltered;
  const artists = homeData?.upcomingArtists || [];

  // Dynamically build category tabs from backend/admin categories
  const categoryTabList = React.useMemo(() => {
    const list = [
      { id: 'All', name: 'All Events', icon: Sparkles, count: cityFiltered.length }
    ];

    categories.forEach((catItem: any) => {
      const catName = typeof catItem === 'string' ? catItem : (catItem?.name || '');
      if (!catName) return;
      const meta = getCategoryMeta(catName);
      const matchingCount = cityFiltered.filter((e: any) => {
        const itemCat = e.category?.toLowerCase() || '';
        const target = catName.toLowerCase();
        return itemCat.includes(target) || target.includes(itemCat);
      }).length;

      list.push({
        id: catName,
        name: meta.name || catName,
        icon: meta.icon || Sparkles,
        count: matchingCount
      });
    });

    return list;
  }, [categories, cityFiltered]);

  // If currently active category is deleted by admin, safely fallback to 'All'
  useEffect(() => {
    if (selectedCategoryTab !== 'All' && categories.length > 0) {
      const exists = categories.some((c: any) => {
        const name = typeof c === 'string' ? c : c?.name;
        return name?.toLowerCase() === selectedCategoryTab.toLowerCase();
      });
      if (!exists) {
        setSelectedCategoryTab('All');
      }
    }
  }, [categories, selectedCategoryTab]);

  const categoryFilteredEvents = selectedCategoryTab === 'All'
    ? cityFiltered
    : cityFiltered.filter((item: any) => {
        const cat = item.category?.toLowerCase() || '';
        const target = selectedCategoryTab.toLowerCase();
        return cat.includes(target) || target.includes(cat);
      });

  const displayCategoryEvents = categoryFilteredEvents.length > 0
    ? categoryFilteredEvents
    : (selectedCategoryTab === 'All' 
        ? allTrending 
        : allTrending.filter((item: any) => {
            const cat = item.category?.toLowerCase() || '';
            const target = selectedCategoryTab.toLowerCase();
            return cat.includes(target) || target.includes(cat);
          }));

  const comingUpEvents = React.useMemo(() => {
    let list = trending;
    if (comingUpFilter === 'Weekend') {
      const filtered = list.filter((item: any) => {
        if (!item.startsAt) return false;
        const d = new Date(item.startsAt);
        const day = d.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
      });
      return filtered.length > 0 ? filtered : list;
    } else if (comingUpFilter === 'Month') {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const filtered = list.filter((item: any) => {
        if (!item.startsAt) return true;
        const d = new Date(item.startsAt);
        return d >= now && d <= in30Days;
      });
      return filtered.length > 0 ? filtered : list;
    }
    return list;
  }, [trending, comingUpFilter]);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20">



      {/* Hero Carousel (Infinite Center Mode like BookMyShow) */}
      <div className="relative w-full h-44 sm:h-64 md:h-84 lg:h-96 flex justify-center items-center overflow-hidden bg-white py-4 my-4">
        {loading ? (
          <BannerSkeleton />
        ) : banners.length > 0 ? (
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
                  <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 hover:border-amber-400/80 transition-all cursor-pointer">
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
              className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-20 w-8 h-10 md:w-10 md:h-14 bg-white/90 hover:bg-amber-400 hover:text-slate-950 backdrop-blur text-slate-800 flex items-center justify-center rounded-xl opacity-90 transition-all cursor-pointer border border-slate-200 shadow-md"
            >
              <ChevronLeft className="w-5 h-5 md:w-8 md:h-8" />
            </button>
            <button 
              onClick={nextSlide}
              className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-20 w-8 h-10 md:w-10 md:h-14 bg-white/90 hover:bg-amber-400 hover:text-slate-950 backdrop-blur text-slate-800 flex items-center justify-center rounded-xl opacity-90 transition-all cursor-pointer border border-slate-200 shadow-md"
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
                    className={`h-2 rounded-full transition-all cursor-pointer ${index === activeDot ? 'w-6 bg-amber-400' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                  />
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {/* Featured events */}
      <div className="max-w-7xl mx-auto px-4 mt-16 mb-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Featured events
              </h2>
              {selectedCity && selectedCity !== 'All Cities' && (
                <span className="text-xs md:text-sm font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300 whitespace-nowrap">
                  in {selectedCity}
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
              {selectedCity && selectedCity !== 'All Cities' 
                ? `Showing events taking place in ${selectedCity}` 
                : "Don't miss these top events across Australia"}
            </p>
          </div>
          <Link href={`/events${selectedCity && selectedCity !== 'All Cities' ? `?city=${encodeURIComponent(selectedCity)}` : ''}`} className="text-xs sm:text-sm font-bold text-amber-600 hover:text-amber-700 inline-flex items-center group shrink-0 whitespace-nowrap self-start sm:self-auto">
            <span>See all</span> <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => <EventCardSkeleton key={i} />)
          ) : trending.length === 0 ? (
            <div className="col-span-full bg-white/90 rounded-3xl p-10 border border-slate-200 text-center shadow-lg">
              <MapPin className="w-12 h-12 text-amber-500 mx-auto mb-3 opacity-80" />
              <h3 className="text-xl font-black text-slate-900">No events currently listed in {selectedCity}</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                We don&apos;t have any live shows in {selectedCity} right now, but there are great events happening across Australia!
              </p>
              <button 
                onClick={() => setSelectedCity('All Cities')}
                className="px-6 py-2.5 bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-full text-xs font-black transition shadow-md shadow-amber-400/25 cursor-pointer"
              >
                Explore All Cities
              </button>
            </div>
          ) : trending.slice(0, 4).map((item: any) => {
            const title = item.title;
            const sub = `${item.venue?.city || 'Location'} • ${item.venue?.name || 'Venue'}`;
            const img = item.posterPath || '/banner/placeholder.avif';
            const totalAvailable = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
            const totalQuantity = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.quantity ?? 0), 0) ?? 0;
            const minPrice = item.ticketTypes?.length 
              ? Math.min(...item.ticketTypes.map((t: any) => t.priceCents || 0)) / 100 
              : 0;
            const now = new Date();
            const startsAt = item.startsAt ? new Date(item.startsAt) : null;
            const isBookingClosed = startsAt ? now >= new Date(startsAt.getTime() - 60 * 60 * 1000) : false;
            const isSoldOut = totalAvailable <= 0;

            return (
              <div key={`featured-${item.id || item.slug}`} className="flex flex-col">
                <Link href={`/events/${item.slug}`} className="relative aspect-square md:aspect-4/5 rounded-2xl overflow-hidden mb-3 shadow-sm block border border-slate-200/90 bg-slate-100">
                  <SafeImage src={item.posterPath} alt={title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                  <div className="absolute top-2.5 left-2.5 bg-amber-400 text-slate-950 text-[10px] uppercase font-black px-2.5 py-1 rounded-lg shadow-sm">
                    Featured
                  </div>
                  {/* Seats / Status badge on poster */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-1">
                    {isBookingClosed ? (
                      <span className="bg-slate-900/90 backdrop-blur-sm text-slate-300 border border-slate-700 text-[11px] font-extrabold uppercase px-2 py-1 rounded-lg shadow">
                        Booking Closed
                      </span>
                    ) : isSoldOut ? (
                      <span className="bg-red-600/95 backdrop-blur-sm text-white text-[11px] font-extrabold uppercase px-2 py-1 rounded-lg shadow">
                        Sold Out
                      </span>
                    ) : (
                      <span className="bg-black/75 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded-lg shadow flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${totalAvailable <= 10 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                        {totalAvailable} / {totalQuantity || 100} Seats
                      </span>
                    )}
                    {minPrice > 0 && !isBookingClosed && !isSoldOut && (
                      <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                        ${minPrice}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex flex-col flex-1">
                  <p className="text-xs text-slate-500 font-semibold mb-1 truncate flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-500"/> {sub}</p>
                  <Link href={`/events/${item.slug}`} className="font-bold text-slate-900 leading-tight mb-2 line-clamp-2">
                    {title}
                  </Link>
                  <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500">
                      {item.startsAt ? new Date(item.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upcoming'}
                    </span>
                    {isBookingClosed ? (
                      <span className="text-xs font-bold text-slate-400 cursor-not-allowed">
                        Closed
                      </span>
                    ) : isSoldOut ? (
                      <span className="text-xs font-bold text-red-500 cursor-not-allowed">
                        Sold Out
                      </span>
                    ) : (
                      <Link href={`/events/${item.slug}`} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center">
                        Get tickets <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Browse by Category - Authentic Live Ticketing Shelf (BookMyShow / Eventbrite Style) */}
      <div className="max-w-7xl mx-auto px-4 mb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Book By Category
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Explore Live Shows & Events
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Select a genre to instantly view and book tickets for upcoming live performances
            </p>
          </div>
          <Link 
            href={`/events${selectedCategoryTab !== 'All' ? `?category=${encodeURIComponent(selectedCategoryTab)}` : ''}`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-black bg-slate-100 hover:bg-amber-400 px-5 py-2.5 rounded-full transition-all shrink-0 border border-slate-200 shadow-2xs group"
          >
            <span>View all {selectedCategoryTab !== 'All' ? selectedCategoryTab : ''} shows</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Quick Category Strip / Interactive Pill Tabs (BookMyShow / Paytm Insider Style) */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          {categoryTabList.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedCategoryTab.toLowerCase() === tab.id.toLowerCase();
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategoryTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-slate-950 text-amber-400 border-slate-900 shadow-md shadow-slate-950/20 scale-102'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{tab.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Live Ticket Booking Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mt-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => <EventCardSkeleton key={`cat-skeleton-${i}`} />)
          ) : displayCategoryEvents.length === 0 ? (
            <div className="col-span-full bg-slate-50 rounded-3xl p-10 border border-slate-200 text-center">
              <MapPin className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
              <h3 className="text-lg font-bold text-slate-900">No {selectedCategoryTab} shows listed right now</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                Check back soon or explore all live shows happening across the country.
              </p>
              <button 
                onClick={() => setSelectedCategoryTab('All')}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Show All Events
              </button>
            </div>
          ) : (
            displayCategoryEvents.slice(0, 8).map((item: any) => {
              const title = item.title;
              const sub = `${item.venue?.city || 'Location'} • ${item.venue?.name || 'Venue'}`;
              const img = item.posterPath || '/banner/placeholder.avif';
              const totalAvailable = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
              const minPrice = item.ticketTypes?.length 
                ? Math.min(...item.ticketTypes.map((t: any) => t.priceCents || 0)) / 100 
                : 0;
              const dateStr = item.startsAt 
                ? new Date(item.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Upcoming';

              const now = new Date();
              const startsAt = item.startsAt ? new Date(item.startsAt) : null;
              const isBookingClosed = startsAt ? now >= new Date(startsAt.getTime() - 60 * 60 * 1000) : false;
              const isSoldOut = totalAvailable <= 0;

              return (
                <div key={`cat-${item.id || item.slug}`} className="flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3 shadow-xs">
                  {/* Poster Link */}
                  <Link href={`/events/${item.slug}`} className="relative aspect-4/5 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 block mb-3">
                    <SafeImage 
                      src={item.posterPath} 
                      alt={title} 
                      fill 
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" 
                      className="object-cover" 
                    />
                    
                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <span className="bg-slate-950/80 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
                        {item.category || selectedCategoryTab || 'Event'}
                      </span>
                      {minPrice > 0 && !isBookingClosed && !isSoldOut && (
                        <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-2 py-0.5 rounded-md shadow-sm">
                          From ${minPrice}
                        </span>
                      )}
                    </div>

                    {/* Bottom Status on Poster */}
                    <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                      {isBookingClosed ? (
                        <span className="inline-block bg-slate-900/90 backdrop-blur-sm text-slate-300 border border-slate-700 text-[10px] font-black uppercase px-2 py-1 rounded-md shadow">
                          Booking Closed
                        </span>
                      ) : isSoldOut ? (
                        <span className="inline-block bg-red-600/95 backdrop-blur-sm text-white text-[10px] font-black uppercase px-2 py-1 rounded-md shadow">
                          Sold Out
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-black/75 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-md shadow">
                          <span className={`w-1.5 h-1.5 rounded-full ${totalAvailable <= 10 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                          {totalAvailable} Seats Left
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Details & Direct Booking Action */}
                  <div className="flex flex-col flex-1 px-1">
                    <p className="text-[11px] text-slate-500 font-bold mb-1 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                      {sub}
                    </p>

                    <Link href={`/events/${item.slug}`} className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 mb-2">
                      {title}
                    </Link>

                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Date</span>
                        <span className="text-xs font-bold text-slate-700">{dateStr}</span>
                      </div>

                      {isBookingClosed ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed">
                          Closed
                        </span>
                      ) : isSoldOut ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-bold cursor-not-allowed">
                          Sold Out
                        </span>
                      ) : (
                        <Link 
                          href={`/events/${item.slug}`}
                          className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-xs cursor-pointer"
                        >
                          <span>Book</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* On sale now - Luxury Dark Showcase Banner */}
      <div className="max-w-7xl mx-auto px-4 mb-20">
        <div className="relative rounded-3xl md:rounded-[36px] overflow-hidden bg-linear-to-r from-[#070b13] via-[#0d131f] to-[#080c14] border border-amber-500/25 p-7 md:p-10 lg:p-12 shadow-2xl shadow-black/40">
          
          {/* Ambient Amber Glows */}
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/20 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute top-0 right-10 w-72 h-72 bg-amber-400/10 rounded-full blur-[100px] pointer-events-none" />
          
          {/* Abstract Golden Wave Vector Wireframes (matches user design) */}
          <svg className="absolute -left-10 -bottom-14 w-125 h-90 pointer-events-none opacity-45 overflow-visible" viewBox="0 0 500 360" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goldCurve" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M-30 350 C 50 330, 80 260, 130 230 C 190 190, 250 240, 310 200 C 360 170, 410 110, 470 70" stroke="url(#goldCurve)" strokeWidth="1.6" />
            <path d="M-30 365 C 60 345, 90 275, 140 245 C 200 205, 260 255, 320 215 C 370 185, 420 125, 480 85" stroke="url(#goldCurve)" strokeWidth="1.3" />
            <path d="M-30 335 C 40 315, 70 245, 120 215 C 180 175, 240 225, 300 185 C 350 155, 400 95, 460 55" stroke="url(#goldCurve)" strokeWidth="1.2" />
            <path d="M-30 320 C 30 295, 60 230, 110 200 C 170 160, 230 210, 290 170 C 340 140, 390 80, 450 40" stroke="url(#goldCurve)" strokeWidth="0.9" opacity="0.75" />
            <path d="M-30 300 C 20 275, 50 215, 100 185 C 160 145, 220 195, 280 155 C 330 125, 380 65, 440 25" stroke="url(#goldCurve)" strokeWidth="0.7" opacity="0.55" />
            {/* Glowing Accent Ribbon */}
            <path d="M-50 390 C 30 370, 80 310, 130 290 C 180 270, 220 310, 270 280" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" filter="blur(7px)" opacity="0.5" />
          </svg>

          <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 lg:gap-10">
            
            {/* Left Header & CTA */}
            <div className="xl:w-80 shrink-0">
              <span className="inline-block text-[11px] font-black tracking-widest uppercase text-amber-400 mb-2">
                TRENDING NOW
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                On sale now
              </h2>
              <p className="text-gray-300 text-sm sm:text-base font-medium mt-3 mb-8">
                Grab your tickets before they&apos;re gone.
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2.5 bg-white text-slate-950 font-extrabold px-7 py-3.5 rounded-full hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all text-sm shadow-xl shadow-black/30 group"
              >
                <span>Explore all</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Right Cards Showcase (3 sleek cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 flex-1 w-full">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-[#121724]/90 border border-white/10 p-3 flex flex-col gap-3">
                    <div className="w-full aspect-16/11 bg-slate-800 animate-pulse rounded-xl" />
                    <div className="h-5 bg-slate-800 animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-slate-800 animate-pulse rounded w-1/2" />
                  </div>
                ))
              ) : (() => {
                // Task 1: Show top 3 events with the lowest ticket prices
                const eventsWithPrice = (trending || []).map((item: any, i: number) => {
                  const prices = (item.ticketTypes || [])
                    .map((t: any) => t.priceCents || 0)
                    .filter((p: number) => p > 0);
                  const minPrice = prices.length > 0 ? Math.min(...prices) / 100 : 0;
                  return { item, minPrice, index: i };
                });

                // Sort by lowest price first (items with prices > 0 first, then lowest price)
                const sortedByLowestPrice = [...eventsWithPrice].sort((a, b) => {
                  if (a.minPrice > 0 && b.minPrice > 0) return a.minPrice - b.minPrice;
                  if (a.minPrice > 0) return -1;
                  if (b.minPrice > 0) return 1;
                  return 0;
                }).slice(0, 3);

                const liveCards = sortedByLowestPrice.map(({ item, minPrice, index }) => ({
                  id: item.id || `live-${index}`,
                  title: item.title,
                  subtitle: `${item.venue?.city || 'Melbourne'}${item.venue?.name ? ` • ${item.venue.name}` : ''}`,
                  category: item.category || 'Event',
                  date: item.startsAt ? new Date(item.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upcoming',
                  price: minPrice > 0 ? `$${minPrice}+` : '',
                  image: item.posterPath || '/banner/placeholder.avif',
                  link: `/events/${item.slug}`
                }));

                if (liveCards.length === 0) {
                  return (
                    <div className="col-span-full py-8 text-center text-gray-400 text-sm">
                      No featured shows right now.
                    </div>
                  );
                }

                return liveCards.map((card, idx) => (
                  <Link
                    key={card.id || idx}
                    href={card.link}
                    className="relative rounded-2xl overflow-hidden bg-[#121724]/90 border border-white/10 flex flex-col"
                  >
                    {/* Top Poster Image */}
                    <div className="relative aspect-16/11 w-full overflow-hidden bg-slate-900">
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                      />
                      {/* Category Badge Pill */}
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md">
                        {card.category}
                      </div>
                    </div>

                    {/* Bottom Card Info */}
                    <div className="p-4.5 flex flex-col flex-1 justify-between bg-linear-to-b from-[#121724] to-[#0a0e16]">
                      <div>
                        <h3 className="text-white font-bold text-base md:text-lg leading-tight line-clamp-1">
                          {card.title}
                        </h3>
                        <p className="text-gray-400 text-xs font-medium truncate mt-1">
                          {card.subtitle}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-medium">
                          {card.date}
                        </span>
                        <span className="text-base md:text-lg font-black text-amber-400">
                          {card.price}
                        </span>
                      </div>
                    </div>
                  </Link>
                ));
              })()}
            </div>

          </div>
        </div>
      </div>

      {/* Browse by city */}
      {availableCities.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mb-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-bold tracking-wide mb-2.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" /> Live Cities & Destinations
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                Browse by city
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                Click a city to discover local concerts, festivals, and live entertainment
              </p>
            </div>

            {selectedCity && selectedCity !== 'All Cities' && (
              <button
                onClick={() => {
                  setSelectedCity('All Cities');
                  toast.success('Showing all events across Australia');
                }}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-4 py-2 rounded-full transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
              >
                <Globe className="w-4 h-4 text-amber-600" />
                <span>Show All Australia</span>
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {availableCities.map((city) => {
              const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
              const stateName = CITY_STATES[city.toLowerCase().trim()] || 'Australia';

              return (
                <button 
                  key={city} 
                  onClick={() => {
                    setSelectedCity(city);
                    toast.success(`Showing events for ${city}`);
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }} 
                  className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl text-left h-40 sm:h-48 flex flex-col justify-between p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'ring-3 ring-amber-400 border-2 border-amber-400 shadow-[0_10px_25px_-5px_rgba(251,191,36,0.4)] scale-[1.02]'
                      : 'border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  {/* City Background Photo with Zoom on Hover */}
                  <Image
                    src={homeData?.cityImages?.[city.toLowerCase().trim()] || DEFAULT_CITY_IMAGE}
                    alt={city}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />

                  {/* Gradient Dark Overlay */}
                  <div className={`absolute inset-0 transition-opacity duration-300 ${
                    isSelected 
                      ? 'bg-linear-to-t from-slate-950 via-slate-950/60 to-slate-950/40' 
                      : 'bg-linear-to-t from-slate-950/90 via-slate-950/50 to-slate-950/25 group-hover:from-slate-950 group-hover:via-slate-950/60'
                  }`} />

                  {/* Top Badges */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Shows
                    </span>

                    {isSelected && (
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs">
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Bottom City Name & Action */}
                  <div className="relative z-10">
                    <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-amber-300 mb-0.5">
                      {stateName}
                    </p>
                    <h3 className="font-black text-white text-lg sm:text-2xl tracking-tight leading-tight group-hover:text-amber-300 transition-colors">
                      {city}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300 mt-1 opacity-90 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <span>Explore concerts</span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Coming up list - High-End Luxury Live Tour Dates */}
      <div className="max-w-7xl mx-auto px-4 mb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-semibold tracking-wide mb-2">
              <Calendar className="w-3.5 h-3.5 text-amber-600" /> Tour Calendar & Gigs
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Upcoming Tour Dates & Shows
            </h2>
            <p className="text-xs sm:text-sm font-normal text-slate-500 mt-1">
              Discover live gigs, stadium tours, and comedy specials with instant ticket booking
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full border border-slate-200/80">
              {[
                { id: 'All', label: 'All Dates' },
                { id: 'Weekend', label: 'This Weekend' },
                { id: 'Month', label: 'Next 30 Days' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setComingUpFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    comingUpFilter === tab.id
                      ? 'bg-slate-950 text-amber-400 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link href="/events" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700 group pl-2">
              <span>View all</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {loading ? (
            Array(5).fill(0).map((_, i) => <EventListRowSkeleton key={`coming-skeleton-${i}`} />)
          ) : comingUpEvents.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-10 border border-slate-200 text-center">
              <Calendar className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
              <h3 className="text-lg font-semibold text-slate-900">No shows found for this filter</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Try selecting &quot;All Dates&quot; to see all upcoming live performances.
              </p>
              <button
                onClick={() => setComingUpFilter('All')}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-full text-xs font-semibold transition shadow-sm cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            comingUpEvents.slice(0, 8).map((item: any) => {
              const dateObj = new Date(item.startsAt || item.startDate || Date.now());
              const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
              const day = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
              const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

              const totalAvailable = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
              const totalQuantity = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.quantity ?? 0), 0) ?? 0;
              const minPrice = item.ticketTypes?.length 
                ? Math.min(...item.ticketTypes.map((t: any) => t.priceCents || 0)) / 100 
                : 0;

              const now = new Date();
              const startsAt = item.startsAt ? new Date(item.startsAt) : null;
              const isBookingClosed = startsAt ? now >= new Date(startsAt.getTime() - 60 * 60 * 1000) : false;
              const isSoldOut = totalAvailable <= 0 && item.ticketTypes && item.ticketTypes.length > 0;

              return (
                <div 
                  key={`coming-${item.id || item.slug}`} 
                  className="relative flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-2xs gap-4"
                >
                  {/* Left Block: Date Badge + Thumbnail + Details */}
                  <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                    
                    {/* High-Contrast Calendar Date Tile */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-14 h-14 sm:w-16 sm:h-18 rounded-xl bg-linear-to-b from-slate-950 to-slate-900 border border-slate-800 text-white p-1 sm:p-1.5 shadow-2xs">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-400 leading-tight">
                        {month}
                      </span>
                      <span className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-none my-0.5">
                        {day}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-medium uppercase text-slate-400 tracking-wide leading-tight">
                        {weekday}
                      </span>
                    </div>

                    {/* Poster Thumbnail */}
                    <Link 
                      href={`/events/${item.slug}`} 
                      className="relative w-18 h-18 sm:w-22 sm:h-18 md:w-26 md:h-18 rounded-lg sm:rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/80 shadow-2xs block"
                    >
                      <SafeImage 
                        src={item.posterPath} 
                        alt={item.title} 
                        fill 
                        sizes="(max-width: 640px) 100vw, 150px" 
                        className="object-cover" 
                      />
                      {item.category && (
                        <div className="absolute top-1 left-1 bg-slate-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-medium uppercase text-amber-300 border border-white/10 hidden sm:block">
                          {item.category}
                        </div>
                      )}
                    </Link>

                    {/* Event Info Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      {/* Status / Category Badges */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70">
                          <Mic className="w-2.5 h-2.5 text-amber-500" />
                          {item.category || 'Live Event'}
                        </span>

                        {isBookingClosed ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Booking Closed
                          </span>
                        ) : isSoldOut ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                            Sold Out
                          </span>
                        ) : totalAvailable <= 15 && totalAvailable > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Flame className="w-2.5 h-2.5 text-amber-500" />
                            {totalAvailable} Left
                          </span>
                        ) : totalAvailable > 0 ? (
                          <span className="items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full hidden sm:inline-flex">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {totalAvailable} Seats Left
                          </span>
                        ) : null}
                      </div>

                      {/* Title */}
                      <Link 
                        href={`/events/${item.slug}`} 
                        className="font-semibold text-slate-900 text-base sm:text-lg leading-snug tracking-tight truncate block"
                      >
                        {item.title}
                      </Link>

                      {/* Venue & Time Meta */}
                      <div className="flex items-center gap-3 text-xs font-normal text-slate-500 mt-1 truncate">
                        {item.venue?.name && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">{item.venue.name}{item.venue.city ? `, ${item.venue.city}` : ''}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{timeStr}</span>
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Right Block: Price + CTA Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 sm:pl-5 sm:border-l sm:border-slate-100 pt-2.5 sm:pt-0 border-t border-slate-100 sm:border-t-0">
                    <div className="flex flex-col sm:items-end">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Tickets From</span>
                      <span className="text-base sm:text-lg font-semibold text-slate-900">
                        {minPrice > 0 ? `$${minPrice}` : '$499+'}
                      </span>
                    </div>

                    {isBookingClosed ? (
                      <span className="px-4 py-2 rounded-full bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed">
                        Closed
                      </span>
                    ) : isSoldOut ? (
                      <span className="px-4 py-2 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-semibold cursor-not-allowed">
                        Sold Out
                      </span>
                    ) : (
                      <Link 
                        href={`/events/${item.slug}`} 
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer"
                      >
                        <span>Get tickets</span>
                        <Ticket className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Frequently Asked Questions (FAQ Accordion) */}
      <div className="max-w-4xl mx-auto px-4 mb-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-semibold tracking-wide mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Got Questions? We&apos;ve Got Answers
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {faqData.heading || "Frequently Asked Questions"}
          </h2>
          <p className="text-sm sm:text-base font-normal text-slate-500 mt-2 max-w-xl mx-auto">
            {faqData.subheading || "Everything you need to know about booking, instant digital QR tickets, venue gate entry, and refunds."}
          </p>
        </div>

        <div className="space-y-3.5">
          {faqData.items.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen 
                    ? 'bg-white border-amber-400/80 shadow-md ring-1 ring-amber-400/20' 
                    : 'bg-white border-slate-200/90 shadow-2xs'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className={`text-base sm:text-lg font-bold transition-colors ${
                    isOpen ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                    {faq.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    isOpen ? 'bg-amber-100 text-amber-700 rotate-180' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <div 
                  className={`grid transition-all duration-300 ease-in-out px-6 ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0 pb-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal pt-2 border-t border-slate-100">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Still have questions help box */}
        <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Still have questions or need assistance?</h4>
              <p className="text-xs text-slate-500">Our customer support team is available 24/7 to help you with booking & tickets.</p>
            </div>
          </div>
          <Link 
            href="#" 
            className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
          >
            Contact Support
          </Link>
        </div>
      </div>

      {/* Footer Features */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mb-8">Simple, and handled by real people</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { title: "No hidden fees", desc: "What you see is what you pay. No surprises at checkout." },
            { title: "Secure booking", desc: "Your data is protected with the highest security standards." },
            { title: "24/7 Support", desc: "Our local team is always ready to help you with anything." },
            { title: "Refund guarantee", desc: "Changed your mind? Cancel for a full refund up to 24h before." }
          ].map((feat, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center mb-4">
                   <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
             </div>
          ))}
        </div>

        {/* Let's Talk CTA - Styled matching the On Sale Now luxury showcase banner */}
        <div className="relative rounded-3xl md:rounded-[36px] overflow-hidden bg-linear-to-r from-[#070b13] via-[#0d131f] to-[#080c14] border border-amber-500/25 p-8 md:p-12 lg:p-14 text-white shadow-2xl shadow-black/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          
          {/* Ambient Amber Glows */}
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/20 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute top-0 right-10 w-72 h-72 bg-amber-400/10 rounded-full blur-[100px] pointer-events-none" />
          
          {/* Abstract Golden Wave Vector Wireframes (matches On sale now banner) */}
          <svg className="absolute -left-10 -bottom-14 w-150 h-75 pointer-events-none opacity-45 overflow-visible" viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goldCurveCTA" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M-30 290 C 70 270, 110 200, 170 170 C 240 135, 310 185, 380 145 C 440 120, 500 70, 580 30" stroke="url(#goldCurveCTA)" strokeWidth="1.6" />
            <path d="M-30 305 C 80 285, 120 215, 180 185 C 250 150, 320 200, 390 160 C 450 135, 510 85, 590 45" stroke="url(#goldCurveCTA)" strokeWidth="1.3" />
            <path d="M-30 275 C 60 255, 100 185, 160 155 C 230 120, 300 170, 370 130 C 430 105, 490 55, 570 15" stroke="url(#goldCurveCTA)" strokeWidth="1.2" />
            <path d="M-30 260 C 50 235, 90 170, 150 140 C 220 105, 290 155, 360 115 C 420 90, 480 40, 560 0" stroke="url(#goldCurveCTA)" strokeWidth="0.9" opacity="0.75" />
            <path d="M-30 240 C 40 215, 80 155, 140 125 C 210 90, 280 140, 350 100 C 410 75, 470 25, 550 -15" stroke="url(#goldCurveCTA)" strokeWidth="0.7" opacity="0.55" />
            {/* Glowing Accent Ribbon */}
            <path d="M-50 330 C 50 310, 110 240, 170 220 C 230 200, 280 240, 340 210" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" filter="blur(7px)" opacity="0.45" />
          </svg>

          <div className="relative z-10 max-w-xl">
             <span className="inline-block text-[11px] font-black tracking-widest uppercase text-amber-400 mb-3">
               FOR ORGANISERS & CREATORS
             </span>
             <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-4">
               Putting on a show? Let&apos;s talk.
             </h2>
             <p className="text-gray-300 text-sm sm:text-base font-medium leading-relaxed">
               Join thousands of creators using our platform to sell tickets, manage events, and grow their audience.
             </p>
          </div>

          <div className="relative z-10 flex items-center w-full md:w-auto shrink-0">
             <Link 
               href="/become-an-organiser" 
               className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-8 py-4 rounded-full transition-all text-sm sm:text-base shadow-xl shadow-amber-400/20 hover:scale-105 active:scale-95 group cursor-pointer"
             >
               <span>Contact Details & Requirements</span>
               <ArrowRight className="w-5 h-5 text-slate-950 transition-transform group-hover:translate-x-1" />
             </Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}
