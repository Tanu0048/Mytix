import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
  TextInput,
  Modal,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LocationStore } from '../../services/locationStore';
import Skeleton from '../../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';

const MYTIX_LOGO = require('../../assets/images/Minimalist_Mytix_Yellow_X_Logo-removebg-preview.png');

const { width } = Dimensions.get('window');
const BANNER_CARD_WIDTH = width - 32;
const BANNER_CARD_HEIGHT = Math.round(BANNER_CARD_WIDTH * (9 / 16));

import { API_BASE, BACKEND_HOST } from '../../constants/api';

function getFullImageUrl(path: string | undefined): string {
  if (!path) return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80';
  if (path.startsWith('http')) return path;
  return `${BACKEND_HOST}${path}`;
}

export default function HomeScreen() {
  const router = useRouter();

  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>(LocationStore.getCity());
  const [availableCities, setAvailableCities] = useState<string[]>(['All Cities']);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const bannerScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    LocationStore.init().then((city) => setSelectedCity(city));
    const unsubscribe = LocationStore.subscribe((city) => {
      setSelectedCity(city);
    });
    return unsubscribe;
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [bannersRes, homeRes, catRes, eventsRes, venuesRes] = await Promise.all([
        fetch(`${API_BASE}/banners`).catch(() => null),
        fetch(`${API_BASE}/home`).catch(() => null),
        fetch(`${API_BASE}/categories`).catch(() => null),
        fetch(`${API_BASE}/events`).catch(() => null),
        fetch(`${API_BASE}/venues`).catch(() => null),
      ]);

      if (catRes && catRes.ok) {
        const cData = await catRes.json();
        const catList = Array.isArray(cData) ? cData : (cData.data || []);
        setCategories(catList);
      }

      if (bannersRes && bannersRes.ok) {
        const bData = await bannersRes.json();
        setBanners(bData.data || []);
      } else {
        setBanners([]);
      }

      let evList: any[] = [];
      if (eventsRes && eventsRes.ok) {
        const eData = await eventsRes.json();
        evList = Array.isArray(eData) ? eData : (eData.data || eData.events || []);
        setAllEvents(evList);
      } else {
        setAllEvents([]);
      }

      let vList: any[] = [];
      if (venuesRes && venuesRes.ok) {
        const vData = await venuesRes.json();
        vList = Array.isArray(vData) ? vData : (vData.data || []);
        setVenues(vList);
      } else {
        setVenues([]);
      }

      if (homeRes && homeRes.ok) {
        const hData = await homeRes.json();
        setFeaturedEvents(hData.featuredEvents || []);
        setTrendingEvents(hData.trendingEvents || []);

        // Dynamically extract cities configured by admin across venues & events
        const dynamicCities = [
          ...(hData.cities || []),
          ...(hData.featuredEvents || []).map((e: any) => e.venue?.city),
          ...(hData.trendingEvents || []).map((e: any) => e.venue?.city),
          ...evList.map((e: any) => e.venue?.city),
          ...vList.map((v: any) => v.city),
        ]
          .map((c: string) => c?.trim())
          .filter(Boolean);

        const uniqueCities = Array.from(new Set(dynamicCities)).sort();
        if (uniqueCities.length > 0) {
          setAvailableCities(['All Cities', ...uniqueCities]);
        } else {
          setAvailableCities(['All Cities']);
        }
      } else {
        setFeaturedEvents([]);
        setTrendingEvents([]);
        setAvailableCities(['All Cities']);
      }
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-scroll banner every 3.5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({
          x: next * width,
          animated: true,
        });
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [banners.length]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCitySelect = (city: string) => {
    LocationStore.setCity(city);
    setSelectedCity(city);
    setCityModalVisible(false);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/(tabs)/movies',
        params: { q: searchQuery.trim() },
      });
    }
  };

  const handleCategoryPress = (categoryTitle: string) => {
    router.push({
      pathname: '/(tabs)/movies',
      params: { category: categoryTitle },
    });
  };

  const filterByCity = (list: any[]) => {
    if (!selectedCity || selectedCity === 'All Cities' || selectedCity === 'All of Australia') {
      return list;
    }
    return list.filter(
      (e) => e.venue?.city && e.venue.city.toLowerCase() === selectedCity.toLowerCase()
    );
  };

  const filteredFeatured = filterByCity(featuredEvents);
  const filteredTrending = filterByCity(trendingEvents);
  const displayTrending =
    filteredTrending.length > 0
      ? filteredTrending
      : filterByCity(allEvents.length > 0 ? allEvents : featuredEvents);
  const filteredVenues =
    !selectedCity || selectedCity === 'All Cities' || selectedCity === 'All of Australia'
      ? venues
      : venues.filter((v: any) => v.city?.toLowerCase() === selectedCity.toLowerCase());

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar (Clean White) */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Image
            source={MYTIX_LOGO}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        {/* Location Selector (White & Yellow) */}
        <TouchableOpacity
          style={styles.locationSelector}
          onPress={() => setCityModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="location-sharp" size={14} color="#D97706" />
          <Text style={styles.locationText} numberOfLines={1}>
            {selectedCity === 'All Cities' ? 'All of Australia' : selectedCity}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Search bar skeleton */}
          <View style={{ marginBottom: 16 }}>
            <Skeleton width="100%" height={46} borderRadius={16} />
          </View>
          {/* Banner skeleton */}
          <View style={{ marginBottom: 20 }}>
            <Skeleton width="100%" height={BANNER_CARD_HEIGHT} borderRadius={18} />
          </View>
          {/* Categories chips skeleton */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 24 }}>
            {[90, 110, 95, 120, 85].map((w, idx) => (
              <Skeleton key={idx} width={w} height={38} borderRadius={22} />
            ))}
          </ScrollView>
          {/* Section 1 header skeleton */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Skeleton width={160} height={20} borderRadius={6} />
            <Skeleton width={50} height={14} borderRadius={4} />
          </View>
          {/* Horizontal cards skeleton */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 28 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ width: 170, marginRight: 14 }}>
                <Skeleton width={170} height={210} borderRadius={14} style={{ marginBottom: 8 }} />
                <Skeleton width={140} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <Skeleton width={90} height={12} borderRadius={4} />
              </View>
            ))}
          </ScrollView>
          {/* Section 2 header skeleton */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Skeleton width={140} height={20} borderRadius={6} />
            <Skeleton width={50} height={14} borderRadius={4} />
          </View>
          {/* Vertical cards skeleton */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ width: (width - 44) / 2, marginBottom: 16 }}>
                <Skeleton width="100%" height={200} borderRadius={14} style={{ marginBottom: 8 }} />
                <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <Skeleton width="60%" height={12} borderRadius={4} />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F6C636"
            colors={['#F6C636']}
          />
        }
      >
        {/* Search Bar (Light & Crisp) */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, artists, venues..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Banner Carousel (Fits ANY horizontal banner with zero cropping, auto-scrolls, 1 at a time) */}
        {banners.length > 0 && (
          <View style={styles.bannerContainer}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveBannerIndex(idx);
              }}
            >
              {banners.map((banner, index) => {
                const imgUri = getFullImageUrl(banner.imageUrl || banner.imagePath);
                return (
                  <View key={banner.id || index} style={styles.bannerSlide}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.bannerCard}
                      onPress={() => router.push('/(tabs)/movies')}
                    >
                      {/* 100% fitting horizontal banner with zero cropping */}
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.bannerImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Pagination Dots */}
            {banners.length > 1 && (
              <View style={styles.dotsRow}>
                {banners.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === activeBannerIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Categories Section (Sleek Text-Only Pills) */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Browse by Category</Text>
                <Text style={styles.sectionSubheading}>Explore events tailored to your vibe</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/movies')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              <TouchableOpacity
                style={styles.categoryPillCard}
                onPress={() => handleCategoryPress('All')}
                activeOpacity={0.75}
              >
                <Text style={styles.categoryPillTitle}>All</Text>
              </TouchableOpacity>
              {categories
                .filter((catName) => catName.trim().toLowerCase() !== 'all')
                .map((catName) => (
                  <TouchableOpacity
                    key={catName}
                    style={styles.categoryPillCard}
                    onPress={() => handleCategoryPress(catName)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.categoryPillTitle}>{catName}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}

        {/* Featured Events Horizontal Carousel */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeading}>Featured Events</Text>
              <Text style={styles.sectionSubheading}>
                {selectedCity && selectedCity !== 'All Cities' && selectedCity !== 'All of Australia'
                  ? `Popular shows in ${selectedCity}`
                  : 'Handpicked highlights across Australia'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/movies')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {filteredFeatured.length === 0 ? (
            <View style={styles.emptyInlineCard}>
              <Ionicons name="sparkles-outline" size={24} color="#94A3B8" />
              <Text style={styles.emptyInlineText}>
                No featured events in this city right now.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalEventsScroll}
            >
              {filteredFeatured.map((event) => {
                const totalAvail =
                  event.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
                const minPrice = event.ticketTypes?.length
                  ? Math.min(...event.ticketTypes.map((t: any) => t.priceCents || 0)) / 100
                  : 0;

                return (
                  <TouchableOpacity
                    key={event.id || event.slug}
                    style={styles.featuredCard}
                    activeOpacity={0.9}
                    onPress={() => router.push(`/event/${event.slug}`)}
                  >
                    <View style={styles.featuredPosterContainer}>
                      <Image
                        source={{ uri: getFullImageUrl(event.posterPath) }}
                        style={styles.featuredPoster}
                        resizeMode="cover"
                      />
                      {event.category && (
                        <View style={styles.featuredCategoryBadge}>
                          <Text style={styles.featuredCategoryText}>
                            {event.category.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.seatsOverlay}>
                        <View
                          style={[
                            styles.seatsDot,
                            { backgroundColor: totalAvail <= 10 ? '#FB923C' : '#10B981' },
                          ]}
                        />
                        <Text style={styles.seatsText}>{totalAvail} Seats</Text>
                      </View>
                    </View>

                    <View style={styles.featuredInfo}>
                      <Text style={styles.featuredTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      {event.venue && (
                        <Text style={styles.featuredVenue} numberOfLines={1}>
                          {event.venue.name}, {event.venue.city || 'Australia'}
                        </Text>
                      )}
                      <View style={styles.featuredFooter}>
                        <Text style={styles.featuredPrice}>
                          {minPrice > 0 ? `From $${minPrice.toFixed(0)} AUD` : 'Explore'}
                        </Text>
                        <View style={styles.bookSmallPill}>
                          <Text style={styles.bookSmallText}>Book</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Why Choose Mytix Trust Banner (Warm Light Yellow & White) */}
        <View style={styles.trustBanner}>
          <Text style={styles.trustBannerTitle}>Why Australians Choose Mytix</Text>
          <View style={styles.trustGrid}>
            <View style={styles.trustCard}>
              <View style={styles.trustIconCircle}>
                <Ionicons name="shield-checkmark" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustCardTitle}>100% Verified Tickets</Text>
                <Text style={styles.trustCardBody}>
                  Direct from official event organisers with fraud-proof QR entry passes.
                </Text>
              </View>
            </View>

            <View style={styles.trustCard}>
              <View style={styles.trustIconCircle}>
                <Ionicons name="card" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustCardTitle}>Zero Surprise Fees</Text>
                <Text style={styles.trustCardBody}>
                  Transparent upfront pricing in AUD with clear ticket options.
                </Text>
              </View>
            </View>

            <View style={styles.trustCard}>
              <View style={styles.trustIconCircle}>
                <Ionicons name="headset" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustCardTitle}>Local Aussie Support</Text>
                <Text style={styles.trustCardBody}>
                  Dedicated concierge assistance anytime you need help at the gate.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trending Events Vertical List */}
        {/* Trending Events Vertical List */}
        {displayTrending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Trending Across Australia</Text>
                <Text style={styles.sectionSubheading}>Shows selling out quickly this week</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/movies')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.verticalList}>
              {displayTrending.map((event) => {
                const minPrice = event.ticketTypes?.length
                  ? Math.min(...event.ticketTypes.map((t: any) => t.priceCents || 0)) / 100
                  : 0;
                return (
                  <TouchableOpacity
                    key={event.id || event.slug}
                    style={styles.verticalCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/event/${event.slug}`)}
                  >
                    <Image
                      source={{ uri: getFullImageUrl(event.posterPath) }}
                      style={styles.verticalThumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.verticalDetails}>
                      <Text style={styles.verticalCategory}>
                        {event.category?.toUpperCase() || 'LIVE EVENT'}
                      </Text>
                      <Text style={styles.verticalTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.verticalVenue} numberOfLines={1}>
                        {event.venue?.city ? `${event.venue.city} • ` : ''}
                        {event.venue?.name || 'Australia'}
                      </Text>
                      <Text style={styles.verticalPrice}>
                        {minPrice > 0 ? `From $${minPrice.toFixed(0)} AUD` : 'Explore'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Explore Iconic Australian Venues */}
        {filteredVenues.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Iconic Venues</Text>
                <Text style={styles.sectionSubheading}>
                  {selectedCity && selectedCity !== 'All Cities' && selectedCity !== 'All of Australia'
                    ? `Premier stages in ${selectedCity}`
                    : 'Premier stages & entertainment hubs'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/movies')}>
                <Text style={styles.seeAllText}>Explore</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalVenuesScroll}
            >
              {filteredVenues.map((venue: any) => (
                <TouchableOpacity
                  key={venue.id || venue.name}
                  style={styles.venueCard}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/movies',
                      params: { q: venue.name },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.venueIconBox}>
                    <Ionicons name="business" size={18} color="#D97706" />
                  </View>
                  <Text style={styles.venueName} numberOfLines={1}>
                    {venue.name}
                  </Text>
                  <Text style={styles.venueCity} numberOfLines={1}>
                    {venue.city ? `${venue.city}${venue.state ? `, ${venue.state}` : ''}` : 'Australia'}
                  </Text>
                  <View style={styles.venueActionRow}>
                    <Text style={styles.venueActionText}>View Events</Text>
                    <Ionicons name="chevron-forward" size={12} color="#D97706" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Live Shows Discovery Grid */}
        {allEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Upcoming Live Shows</Text>
                <Text style={styles.sectionSubheading}>Instant booking with verified digital passes</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/movies')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.discoveryGrid}>
              {filterByCity(allEvents).map((event: any) => {
                const minPrice = event.ticketTypes?.length
                  ? Math.min(...event.ticketTypes.map((t: any) => t.priceCents || 0)) / 100
                  : 0;
                const totalAvail =
                  event.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
                return (
                  <TouchableOpacity
                    key={event.id || event.slug}
                    style={styles.gridCard}
                    activeOpacity={0.88}
                    onPress={() => router.push(`/event/${event.slug}`)}
                  >
                    <View style={styles.gridPosterContainer}>
                      <Image
                        source={{ uri: getFullImageUrl(event.posterPath) }}
                        style={styles.gridPoster}
                        resizeMode="cover"
                      />
                      {event.category && (
                        <View style={styles.gridCategoryBadge}>
                          <Text style={styles.gridCategoryText}>{event.category.toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={styles.gridSeatsBadge}>
                        <View
                          style={[
                            styles.seatsDot,
                            { backgroundColor: totalAvail <= 10 ? '#FB923C' : '#10B981' },
                          ]}
                        />
                        <Text style={styles.gridSeatsText}>{totalAvail} Seats</Text>
                      </View>
                    </View>
                    <View style={styles.gridInfo}>
                      <Text style={styles.gridTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.gridVenue} numberOfLines={1}>
                        {event.venue?.city ? `${event.venue.city} • ` : ''}
                        {event.venue?.name || 'Australia'}
                      </Text>
                      <View style={styles.gridFooter}>
                        <Text style={styles.gridPrice}>
                          {minPrice > 0 ? `$${minPrice.toFixed(0)} AUD` : 'Explore'}
                        </Text>
                        <View style={styles.gridBookPill}>
                          <Text style={styles.gridBookText}>Book</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Australian Verified Ticketing Guarantee Sleek Banner */}
        <View style={styles.guaranteeSection}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.guaranteeCard}
          >
            {/* Header with shield badge */}
            <View style={styles.guaranteeHeader}>
              <View style={styles.guaranteeIconCircle}>
                <Ionicons name="shield-checkmark" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.guaranteeTagBadge}>
                  <Text style={styles.guaranteeTagText}>100% BUYER PROTECTION</Text>
                </View>
                <Text style={styles.guaranteeHeading}>Australian Verified Guarantee</Text>
              </View>
            </View>

            <Text style={styles.guaranteeDescription}>
              Official partner tickets • Direct promoter verification • Bank-grade encrypted checkout • Guaranteed gate admission across Australia.
            </Text>

            {/* 3 Sleek Micro Pills */}
            <View style={styles.guaranteePillsRow}>
              <View style={styles.guaranteePill}>
                <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                <Text style={styles.guaranteePillText}>Genuine QR Passes</Text>
              </View>
              <View style={styles.guaranteePill}>
                <Ionicons name="lock-closed" size={12} color="#F59E0B" />
                <Text style={styles.guaranteePillText}>Stripe Secured</Text>
              </View>
              <View style={styles.guaranteePill}>
                <Ionicons name="headset" size={13} color="#38BDF8" />
                <Text style={styles.guaranteePillText}>Aussie Support</Text>
              </View>
            </View>

            {/* Subtle Brand Watermark Bottom */}
            <View style={styles.guaranteeFooter}>
              <Text style={styles.guaranteeFooterBrand}>MYTIX AUSTRALIA</Text>
              <Text style={styles.guaranteeFooterDot}>•</Text>
              <Text style={styles.guaranteeFooterText}>Premier Live Entertainment</Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
      )}

      {/* Australian City Selection Modal (White Theme) */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Your City</Text>
                <Text style={styles.modalSubtitle}>Filter events and shows near you</Text>
              </View>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cityList} showsVerticalScrollIndicator={false}>
              {availableCities.map((city) => {
                const isSelected =
                  (city === 'All Cities' &&
                    (!selectedCity || selectedCity === 'All Cities' || selectedCity === 'All of Australia')) ||
                  selectedCity?.toLowerCase() === city.toLowerCase();
                return (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityRow, isSelected && styles.cityRowSelected]}
                    onPress={() => handleCitySelect(city)}
                  >
                    <Ionicons
                      name="location"
                      size={18}
                      color={isSelected ? '#D97706' : '#94A3B8'}
                    />
                    <Text style={[styles.cityText, isSelected && styles.cityTextSelected]}>
                      {city}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#D97706" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 105,
    height: 38,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    maxWidth: 160,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 90,
  },
  scrollContent: {
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  bannerContainer: {
    width: width,
    marginBottom: 20,
  },
  bannerSlide: {
    width: width,
    paddingHorizontal: 16,
  },
  bannerCard: {
    width: BANNER_CARD_WIDTH,
    height: BANNER_CARD_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#F6C636',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
    paddingHorizontal: 16,
  },
  sectionSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: 16,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  categoryPillCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryPillTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  horizontalEventsScroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  featuredCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredPosterContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  featuredPoster: {
    width: '100%',
    height: '100%',
  },
  featuredCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featuredCategoryText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
  },
  seatsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  seatsDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  seatsText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featuredInfo: {
    padding: 10,
  },
  featuredTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  featuredVenue: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 8,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  featuredPrice: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D97706',
  },
  bookSmallPill: {
    backgroundColor: '#F6C636',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bookSmallText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
  emptyInlineCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyInlineText: {
    fontSize: 12,
    color: '#64748B',
  },
  trustBanner: {
    marginHorizontal: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 24,
  },
  trustBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 14,
    textAlign: 'center',
  },
  trustGrid: {
    gap: 10,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  trustIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  trustCardBody: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 1,
  },
  verticalList: {
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 10,
  },
  verticalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  verticalThumbnail: {
    width: 65,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  verticalDetails: {
    flex: 1,
  },
  verticalCategory: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D97706',
  },
  verticalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  verticalVenue: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  verticalPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D97706',
    marginTop: 4,
  },
  guaranteeSection: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 28,
  },
  guaranteeCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  guaranteeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  guaranteeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  guaranteeTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.6,
  },
  guaranteeHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  guaranteeDescription: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  guaranteePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  guaranteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  guaranteePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  guaranteeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  guaranteeFooterBrand: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 1.2,
  },
  guaranteeFooterDot: {
    fontSize: 10,
    color: '#64748B',
  },
  guaranteeFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cityList: {
    marginBottom: 20,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  cityRowSelected: {
    backgroundColor: '#FEF3C7',
  },
  cityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  cityTextSelected: {
    fontWeight: '800',
    color: '#92400E',
  },
  horizontalVenuesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  venueCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  venueIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  venueCity: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
    fontWeight: '500',
  },
  venueActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  venueActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  discoveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  gridCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 4,
  },
  gridPosterContainer: {
    width: '100%',
    aspectRatio: 0.82,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  gridPoster: {
    width: '100%',
    height: '100%',
  },
  gridCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridCategoryText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  gridSeatsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridSeatsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gridInfo: {
    padding: 10,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  gridVenue: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D97706',
  },
  gridBookPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gridBookText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
  },
});
