"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Mic, ArrowRight, Laugh, Flame, Trophy, Drama, Palette, Sparkles, Ticket, MessageCircle, Plus, Receipt, ShieldCheck, LifeBuoy } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BannerSkeleton, EventCardSkeleton, EventListRowSkeleton } from '@/components/ui/Skeleton';
import { useLocationStore } from '@/store/useLocationStore';
import SafeImage from '@/components/SafeImage';
import EventCard from '@/components/ui/EventCard';
import SectionHeader from '@/components/ui/SectionHeader';
import { formatPrice, formatShortDate, formatTime, formatVenue, getEventStatus } from '@/lib/event';

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
    answer: "You can pay with Visa, Mastercard or American Express, with a digital wallet such as Apple Pay or Google Pay, or with Afterpay. All payments are processed securely by Stripe in Australian dollars."
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
  const [categories, setCategories] = useState<any[]>(['Concert', 'Comedy', 'Festival', 'Sports', 'Theatre', 'Workshop']);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('All');
  const [comingUpFilter, setComingUpFilter] = useState<'All' | 'Weekend' | 'Month'>('All');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqData, setFaqData] = useState<{ heading: string; subheading: string; items: { question: string; answer: string }[] }>({
    heading: "Frequently Asked Questions",
    subheading: "Everything you need to know about booking, instant digital QR tickets, venue gate entry, and refunds.",
    items: FAQS
  });
  
  const { selectedCity, setSelectedCity, setAvailableCities } = useLocationStore();

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



  const nextSlide = () => setCurrentSlide((prev) => prev + 1);
  const prevSlide = () => setCurrentSlide((prev) => prev - 1);

  const displayBanners = React.useMemo(() => {
    if (!banners || banners.length === 0) return [];
    if (banners.length === 1) return [banners[0], banners[0], banners[0]];
    if (banners.length === 2) return [...banners, ...banners];
    return [...banners, ...banners];
  }, [banners]);

  const allTrending = React.useMemo(() => {
    const rawList = [
      ...(homeData?.trendingEvents || []),
      ...(homeData?.featuredEvents || [])
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

  // Dedicated Trending events list (from homeData.trendingEvents, fallback to allTrending)
  const trendingList = React.useMemo(() => {
    const rawList = (homeData?.trendingEvents && homeData.trendingEvents.length > 0)
      ? homeData.trendingEvents
      : allTrending;
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

    if (selectedCity && selectedCity !== 'All Cities') {
      return unique.filter((item: any) => item.venue?.city?.toLowerCase() === selectedCity.toLowerCase());
    }
    return unique;
  }, [homeData, allTrending, selectedCity]);

  // Dedicated Featured events list (from homeData.featuredEvents, with deduplication against top trending)
  const featuredList = React.useMemo(() => {
    const rawList = (homeData?.featuredEvents && homeData.featuredEvents.length > 0)
      ? homeData.featuredEvents
      : allTrending;
    const trendingTopKeys = new Set(trendingList.slice(0, 4).map((i: any) => String(i.id || i.slug || '')));
    const seen = new Set<string>();
    const unique: any[] = [];
    const now = Date.now();

    // 1. Prioritize upcoming events not in top 4 trending to avoid duplicates
    for (const item of rawList) {
      if (!item) continue;
      const key = String(item.id || item.slug || '');
      if (!key || seen.has(key)) continue;

      const startsAt = item.startsAt || item.startDate;
      if (!startsAt || new Date(startsAt).getTime() <= now) continue;

      if (!trendingTopKeys.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    // 2. If fewer than 4 events found and rawList has more, include them so section is nicely filled
    if (unique.length < 4) {
      for (const item of rawList) {
        if (!item) continue;
        const key = String(item.id || item.slug || '');
        if (!key || seen.has(key)) continue;

        const startsAt = item.startsAt || item.startDate;
        if (!startsAt || new Date(startsAt).getTime() <= now) continue;

        seen.add(key);
        unique.push(item);
      }
    }

    if (selectedCity && selectedCity !== 'All Cities') {
      return unique.filter((item: any) => item.venue?.city?.toLowerCase() === selectedCity.toLowerCase());
    }
    return unique;
  }, [homeData, allTrending, trendingList, selectedCity]);

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

  const cityQuery = selectedCity && selectedCity !== 'All Cities' ? `?city=${encodeURIComponent(selectedCity)}` : '';
  const inCity = selectedCity && selectedCity !== 'All Cities' ? ` in ${selectedCity}` : '';

  // Three lowest-priced upcoming events for the "Best value" band
  const bestValue = React.useMemo(() => {
    return trending
      .map((item: any) => ({ item, status: getEventStatus(item) }))
      .filter(({ status }) => status.priceFrom > 0 && status.isBookable)
      .sort((a, b) => a.status.priceFrom - b.status.priceFrom)
      .slice(0, 3);
  }, [trending]);

  return (
    <div className="relative isolate min-h-screen bg-white pb-8 text-slate-800">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-linear-to-b from-brand-100/70 via-brand-50/40 to-transparent" />

      {/* Hero carousel (centre mode with peeking neighbours) */}
      <section aria-label="Featured banners" className="relative w-full h-44 sm:h-60 md:h-76 lg:h-85 xl:h-95 overflow-hidden mt-4 sm:mt-6">
        {loading ? (
          <BannerSkeleton />
        ) : banners.length > 0 ? (
          <div className="relative w-full h-full">
            {displayBanners.map((slide, index) => {
              const total = displayBanners.length;
              const diff = index - (currentSlide % total);
              let offset = diff % total;
              if (offset < -Math.floor(total / 2)) offset += total;
              if (offset > Math.floor(total / 2)) offset -= total;

              const isVisible = Math.abs(offset) <= 1;
              const transformStyle = offset === 0
                ? 'translateX(-50%)'
                : offset === 1
                  ? 'translateX(calc(50% + 14px))'
                  : offset === -1
                    ? 'translateX(calc(-150% - 14px))'
                    : `translateX(calc(-50% + ${offset * 100}%))`;

              return (
                <div
                  key={`${slide.id}-${index}`}
                  onClick={() => {
                    if (offset === -1) prevSlide();
                    if (offset === 1) nextSlide();
                  }}
                  className="absolute left-1/2 top-0 w-[84%] sm:w-[80%] md:w-[78%] lg:w-[76%] max-w-300 h-full transition-all duration-500 ease-out cursor-pointer"
                  style={{
                    transform: transformStyle,
                    zIndex: offset === 0 ? 20 : 10,
                    opacity: isVisible ? 1 : 0,
                    pointerEvents: isVisible ? 'auto' : 'none'
                  }}
                >
                  <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden bg-slate-100 ring-1 ring-inset ring-slate-900/5">
                    {slide.targetUrl && offset === 0 ? (
                      <Link href={slide.targetUrl} className="block w-full h-full relative">
                        <Image
                          src={slide.imageUrl || '/banner/placeholder.avif'}
                          alt={slide.title || 'Banner'}
                          fill
                          priority={index === 0 || index === 1}
                          className="object-cover"
                        />
                      </Link>
                    ) : (
                      <Image
                        src={slide.imageUrl || '/banner/placeholder.avif'}
                        alt={slide.title || 'Banner'}
                        fill
                        priority={index === 0 || index === 1}
                        className="object-cover"
                      />
                    )}
                  </div>
                </div>
              );
            })}

            <button
              onClick={prevSlide}
              aria-label="Previous banner"
              className="absolute left-3 md:left-[9%] lg:left-[10%] top-1/2 -translate-y-1/2 z-30 hidden sm:flex w-10 h-10 md:w-11 md:h-11 items-center justify-center rounded-full bg-white/95 text-ink shadow-pop hover:bg-white transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next banner"
              className="absolute right-3 md:right-[9%] lg:right-[10%] top-1/2 -translate-y-1/2 z-30 hidden sm:flex w-10 h-10 md:w-11 md:h-11 items-center justify-center rounded-full bg-white/95 text-ink shadow-pop hover:bg-white transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-sm">
              {banners.map((_, index) => {
                const activeDot = ((currentSlide % banners.length) + banners.length) % banners.length;
                const isActive = index === activeDot;
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={isActive}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      isActive ? 'w-5 bg-brand-400' : 'w-1.5 bg-white/70 hover:bg-white'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {/* Trending events */}
      <section className="container-page mt-12 sm:mt-16">
        <SectionHeader
          eyebrow="Hot right now"
          title={`Trending${inCity}`}
          description={inCity ? `The most-booked shows in ${selectedCity} right now.` : 'The most-booked shows across Australia right now.'}
          action={{ href: `/events${cityQuery}`, label: 'See all' }}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => <EventCardSkeleton key={i} />)
          ) : trendingList.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <MapPin className="w-8 h-8 text-brand-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold">No events in {selectedCity} right now</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                There&apos;s plenty happening elsewhere in Australia — take a look.
              </p>
              <button
                onClick={() => setSelectedCity('All Cities')}
                className="px-5 py-2.5 bg-brand-400 hover:bg-brand-300 text-ink rounded-full text-sm font-semibold transition cursor-pointer"
              >
                Show all of Australia
              </button>
            </div>
          ) : trendingList.slice(0, 4).map((item: any, i: number) => {
            const rank = item.trendingMetrics?.rank;
            const sellingFast = item.trendingMetrics?.recentSalesCount >= 10;
            return (
              <EventCard
                key={`trending-${item.id || item.slug}`}
                event={item}
                badge={rank ? `#${rank} Trending` : sellingFast ? 'Selling fast' : 'Trending'}
                badgeHighlight={rank === 1 || sellingFast}
                priority={i < 2}
              />
            );
          })}
        </div>
      </section>

      {/* Featured events */}
      {(loading || featuredList.length > 0) && (
        <section className="mt-16 sm:mt-20 bg-brand-50/70 border-y border-brand-100 py-12 sm:py-16">
          <div className="container-page">
          <SectionHeader
            eyebrow="Editor's picks"
            title={`Featured${inCity}`}
            description="Hand-picked shows we think you'll love."
            action={{ href: `/events${cityQuery}`, label: 'See all' }}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
            {loading
              ? Array(4).fill(0).map((_, i) => <EventCardSkeleton key={i} />)
              : featuredList.slice(0, 4).map((item: any) => (
                  <EventCard key={`featured-${item.id || item.slug}`} event={item} badge="Featured" badgeHighlight />
                ))}
          </div>
          </div>
        </section>
      )}

      {/* Browse by category */}
      <section className="container-page mt-16 sm:mt-20">
        <SectionHeader
          eyebrow="Find your vibe"
          title="Browse by category"
          description="Pick a genre to see what's coming up."
          action={{
            href: `/events${selectedCategoryTab !== 'All' ? `?category=${encodeURIComponent(selectedCategoryTab)}` : ''}`,
            label: selectedCategoryTab !== 'All' ? `All ${selectedCategoryTab} shows` : 'All shows',
          }}
        />

        <div role="tablist" aria-label="Event categories" className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
          {categoryTabList.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedCategoryTab.toLowerCase() === tab.id.toLowerCase();
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCategoryTab(tab.id)}
                className={`inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-brand-400 text-ink border-brand-400 shadow-sm shadow-brand-400/30'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-ink' : 'text-brand-600'}`} />
                <span>{tab.name}</span>
                <span className={`min-w-5 text-center text-[11px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${
                  isActive ? 'bg-ink/10 text-ink' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 mt-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => <EventCardSkeleton key={`cat-skeleton-${i}`} />)
          ) : displayCategoryEvents.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <h3 className="text-lg font-bold">No {selectedCategoryTab} shows listed right now</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                Check back soon, or browse everything that&apos;s on.
              </p>
              <button
                onClick={() => setSelectedCategoryTab('All')}
                className="px-5 py-2.5 bg-brand-400 hover:bg-brand-300 text-ink rounded-full text-sm font-semibold transition cursor-pointer"
              >
                Show all events
              </button>
            </div>
          ) : (
            displayCategoryEvents.slice(0, 8).map((item: any) => (
              <EventCard key={`cat-${item.id || item.slug}`} event={item} />
            ))
          )}
        </div>
      </section>

      {/* Best value — lowest-priced shows on sale */}
      {(loading || bestValue.length > 0) && (
        <section className="container-page mt-16 sm:mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-8 ring-1 ring-brand-400/20 sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-400/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-400">On sale now</p>
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Great nights, great prices.</h2>
                <p className="mt-3 text-slate-400">The best-value tickets on Mytix this week.</p>
                <Link
                  href="/events"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-brand-400 px-5 text-sm font-semibold text-ink transition hover:bg-brand-300"
                >
                  Explore all events
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {loading
                  ? Array(3).fill(0).map((_, i) => (
                      <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5 sm:h-64" />
                    ))
                  : bestValue.map(({ item, status }) => (
                      <Link
                        key={`value-${item.id || item.slug}`}
                        href={`/events/${item.slug}`}
                        className="group flex gap-3 rounded-2xl bg-white/5 p-2.5 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 sm:flex-col"
                      >
                        <div className="relative aspect-4/5 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5 sm:aspect-16/10 sm:w-full">
                          <SafeImage src={item.posterPath} alt={item.title} fill sizes="(max-width: 640px) 80px, 25vw" className="object-cover" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center sm:px-1 sm:pb-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {formatShortDate(status.startsAt)}
                          </p>
                          <h3 className="mt-0.5 truncate text-base font-bold text-white group-hover:text-brand-300">{item.title}</h3>
                          <p className="truncate text-sm text-slate-400">{formatVenue(item)}</p>
                          <p className="mt-1.5 text-sm font-semibold text-brand-400">From {formatPrice(status.priceFrom)}</p>
                        </div>
                      </Link>
                    ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          BROWSE BY CITY (Temporarily commented out - preserved for future use)
      =========================================================================
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
                  // City Background Photo with Zoom on Hover
                  <Image
                    src={homeData?.cityImages?.[city.toLowerCase().trim()] || DEFAULT_CITY_IMAGE}
                    alt={city}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />

                  // Gradient Dark Overlay
                  <div className={`absolute inset-0 transition-opacity duration-300 ${
                    isSelected 
                      ? 'bg-linear-to-t from-slate-950 via-slate-950/60 to-slate-950/40' 
                      : 'bg-linear-to-t from-slate-950/90 via-slate-950/50 to-slate-950/25 group-hover:from-slate-950 group-hover:via-slate-950/60'
                  }`} />

                  // Top Badges
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

                  // Bottom City Name & Action
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
      */}

      {/* Upcoming dates */}
      <section className="container-page mt-16 sm:mt-20">
        <SectionHeader
          eyebrow="Calendar"
          title="Coming up"
          description="Every upcoming show, soonest first."
          action={{ href: '/events', label: 'View all' }}
        >
          <div role="tablist" aria-label="Date range" className="flex items-center gap-1 rounded-full bg-brand-50 p-1 ring-1 ring-inset ring-brand-100">
            {[
              { id: 'All', label: 'All dates' },
              { id: 'Weekend', label: 'Weekend' },
              { id: 'Month', label: 'Next 30 days' },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={comingUpFilter === tab.id}
                onClick={() => setComingUpFilter(tab.id as 'All' | 'Weekend' | 'Month')}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  comingUpFilter === tab.id
                    ? 'bg-brand-400 text-ink shadow-sm'
                    : 'text-slate-600 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </SectionHeader>

        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={`coming-skeleton-${i}`} className="p-3 sm:p-4"><EventListRowSkeleton /></div>
            ))
          ) : comingUpEvents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-lg font-bold">Nothing in this date range</h3>
              <p className="text-sm text-slate-500 mt-1 mb-5">Try &quot;All dates&quot; to see every upcoming show.</p>
              <button
                onClick={() => setComingUpFilter('All')}
                className="px-5 py-2.5 bg-brand-400 hover:bg-brand-300 text-ink rounded-full text-sm font-semibold transition cursor-pointer"
              >
                Show all dates
              </button>
            </div>
          ) : (
            comingUpEvents.slice(0, 8).map((item: any) => {
              const status = getEventStatus(item);
              const dateObj = status.startsAt || new Date();
              const month = dateObj.toLocaleDateString('en-AU', { month: 'short' });
              const day = dateObj.toLocaleDateString('en-AU', { day: '2-digit' });
              const weekday = dateObj.toLocaleDateString('en-AU', { weekday: 'short' });
              const venue = formatVenue(item);

              return (
                <Link
                  key={`coming-${item.id || item.slug}`}
                  href={`/events/${item.slug}`}
                  className="group flex items-center gap-3 p-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-brand-50/60 sm:gap-5 sm:p-4"
                >
                  <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-200 sm:w-16">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">{month}</span>
                    <span className="font-display text-2xl font-extrabold leading-none text-ink">{day}</span>
                    <span className="text-[10px] font-medium uppercase text-slate-400">{weekday}</span>
                  </div>

                  <div className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:block">
                    <SafeImage src={item.posterPath} alt="" fill sizes="96px" className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      {item.category && (
                        <span className="text-xs font-semibold text-slate-500">{item.category}</span>
                      )}
                      {status.isClosed ? (
                        <span className="text-xs font-semibold text-slate-400">· Booking closed</span>
                      ) : status.isSoldOut ? (
                        <span className="text-xs font-semibold text-red-600">· Sold out</span>
                      ) : status.isLowStock ? (
                        <span className="text-xs font-semibold text-brand-700">· Only {status.available} left</span>
                      ) : null}
                    </div>
                    <h3 className="truncate text-base font-bold group-hover:text-brand-700 sm:text-lg">{item.title}</h3>
                    <p className="truncate text-sm text-slate-500">
                      {[venue, formatTime(status.startsAt)].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    {status.priceFrom > 0 && (
                      <div className="hidden text-right sm:block">
                        <p className="text-xs text-slate-500">From</p>
                        <p className="text-base font-bold text-ink">{formatPrice(status.priceFrom)}</p>
                      </div>
                    )}
                    {status.isBookable ? (
                      <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-400 px-4 text-sm font-semibold text-ink transition group-hover:bg-brand-300">
                        <span className="hidden sm:inline">Get tickets</span>
                        <Ticket className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex h-10 items-center rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-400">
                        {status.isSoldOut ? 'Sold out' : 'Closed'}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* Why Mytix */}
      <section className="container-page mt-16 sm:mt-24">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Receipt, title: 'No hidden fees', desc: 'Fees and GST are shown before you pay. What you see is what you pay.' },
            { icon: ShieldCheck, title: 'Secure checkout', desc: 'Payments are processed by Stripe and never stored on our servers.' },
            { icon: Ticket, title: 'Instant QR tickets', desc: 'Your tickets land in My Tickets and your inbox the moment you book.' },
            { icon: LifeBuoy, title: 'Real support', desc: 'A local team ready to help with bookings, changes and refunds.' },
          ].map((feat) => (
            <div key={feat.title} className="bg-white p-6 sm:p-7">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-400 text-ink shadow-sm shadow-brand-400/30">
                <feat.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">{feat.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page mt-16 sm:mt-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-700">FAQ</p>
            <h2 className="text-3xl font-extrabold sm:text-4xl">{faqData.heading || 'Frequently asked questions'}</h2>
            <p className="mt-3 text-slate-500">
              {faqData.subheading || 'Everything you need to know about booking, QR tickets, entry and refunds.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink-soft">
                <MessageCircle className="h-4 w-4" />
                Contact support
              </Link>
              <Link href="/faq" className="inline-flex h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-ink transition hover:border-slate-400">
                All FAQs
              </Link>
            </div>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqData.items.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`-mx-4 px-4 transition-colors ${isOpen ? 'bg-brand-50/70 rounded-2xl' : ''}`}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="font-display text-base font-bold text-ink sm:text-lg">{faq.question}</span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                      isOpen ? 'rotate-45 bg-brand-400 text-ink' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="pb-5 pr-12 leading-relaxed text-slate-600">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Organiser CTA */}
      <section className="container-page mt-16 sm:mt-24">
        <div className="relative overflow-hidden rounded-3xl bg-brand-400 px-6 py-10 sm:px-12 sm:py-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgb(14 21 37 / 0.18) 1.2px, transparent 1.2px)',
              backgroundSize: '18px 18px',
              maskImage: 'linear-gradient(90deg, transparent 35%, #000)',
              WebkitMaskImage: 'linear-gradient(90deg, transparent 35%, #000)',
            }}
          />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-800">For organisers</p>
              <h2 className="text-3xl font-extrabold sm:text-4xl">Putting on a show? Sell tickets on Mytix.</h2>
              <p className="mt-3 text-brand-800">
                List your event, set up ticket tiers or reserved seating, and reach fans looking for their next night out.
              </p>
            </div>
            <Link
              href="/become-an-organiser"
              className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition hover:bg-ink-soft"
            >
              Become an organiser
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
