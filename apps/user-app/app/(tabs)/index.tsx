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

const MYTIX_LOGO = require('../../assets/images/Minimalist_Mytix_Yellow_X_Logo-removebg-preview.png');

const { width } = Dimensions.get('window');
const BANNER_CARD_WIDTH = width - 32;
const BANNER_CARD_HEIGHT = Math.round(BANNER_CARD_WIDTH * (9 / 16));

import { API_BASE, BACKEND_HOST } from '../../constants/api';

function getCategoryMeta(catName: string) {
  const normalized = (catName || '').toLowerCase().trim();
  switch (normalized) {
    case 'concert':
    case 'music':
      return { icon: 'musical-notes', bg: '#FEF3C7', iconColor: '#D97706' };
    case 'comedy':
      return { icon: 'happy', bg: '#FEE2E2', iconColor: '#DC2626' };
    case 'sports':
    case 'sport':
      return { icon: 'trophy', bg: '#E0E7FF', iconColor: '#4F46E5' };
    case 'theatre':
    case 'theater':
    case 'drama':
      return { icon: 'film', bg: '#F3E8FF', iconColor: '#9333EA' };
    case 'festival':
      return { icon: 'sparkles', bg: '#ECFDF5', iconColor: '#059669' };
    case 'workshop':
    case 'education':
      return { icon: 'color-palette', bg: '#FFEDD5', iconColor: '#EA580C' };
    case 'nightlife':
    case 'party':
    case 'club':
      return { icon: 'beer', bg: '#EDE9FE', iconColor: '#7C3AED' };
    case 'food':
    case 'dining':
      return { icon: 'restaurant', bg: '#FEF08A', iconColor: '#CA8A04' };
    default:
      return { icon: 'grid', bg: '#F1F5F9', iconColor: '#0F172A' };
  }
}

const FAQS = [
  {
    q: 'How do I receive and access my tickets?',
    a: "All tickets on Mytix are 100% digital. Once booked, your verified QR entry pass is instantly generated under the 'My Tickets' tab.",
  },
  {
    q: 'How does entry verification work at the gate?',
    a: "Simply show the QR code on your phone in the 'My Tickets' tab to the turnstile gate scanners for instant, fraud-proof admission.",
  },
  {
    q: 'Can I transfer or cancel my tickets?',
    a: 'Yes! Depending on the organizer refund policy, you can request a cancellation or transfer up to 24 hours before the event starts.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'We support major Credit/Debit cards (Visa, Mastercard, Amex), Apple Pay, and Google Pay with bank-grade encryption.',
  },
];

const AUSTRALIAN_CITIES = [
  'All of Australia',
  'Sydney',
  'Melbourne',
  'Brisbane',
  'Perth',
  'Adelaide',
  'Gold Coast',
  'Canberra',
  'Hobart',
];

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
  const [selectedCity, setSelectedCity] = useState<string>(LocationStore.getCity());
  const [availableCities, setAvailableCities] = useState<string[]>(AUSTRALIAN_CITIES);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
      const [bannersRes, homeRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/banners`).catch(() => null),
        fetch(`${API_BASE}/home`).catch(() => null),
        fetch(`${API_BASE}/categories`).catch(() => null),
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

      if (homeRes && homeRes.ok) {
        const hData = await homeRes.json();
        setFeaturedEvents(hData.featuredEvents || []);
        setTrendingEvents(hData.trendingEvents || []);
        if (hData.cities && Array.isArray(hData.cities) && hData.cities.length > 0) {
          const merged = Array.from(new Set(['All of Australia', ...hData.cities]));
          setAvailableCities(merged);
        }
      } else {
        setFeaturedEvents([]);
        setTrendingEvents([]);
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
    const val = city === 'All of Australia' ? 'All Cities' : city;
    LocationStore.setCity(val);
    setSelectedCity(val);
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
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={{ alignItems: 'center', width: 64 }}>
                <Skeleton width={54} height={54} borderRadius={27} style={{ marginBottom: 6 }} />
                <Skeleton width={44} height={10} borderRadius={4} />
              </View>
            ))}
          </View>
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

        {/* Categories Section (Dynamic from Admin Panel) */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Browse by Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {categories.map((catName) => {
                const meta = getCategoryMeta(catName);
                return (
                  <TouchableOpacity
                    key={catName}
                    style={styles.categoryItem}
                    onPress={() => handleCategoryPress(catName)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.categoryIconCircle, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon as any} size={22} color={meta.iconColor} />
                    </View>
                    <Text style={styles.categoryTitle}>{catName}</Text>
                  </TouchableOpacity>
                );
              })}
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
            {filteredTrending.map((event) => {
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

        {/* FAQs Accordion (White Theme) */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionHeading}>Frequently Asked Questions</Text>
          <Text style={styles.sectionSubheading}>Everything you need to know about Mytix</Text>

          <View style={styles.faqList}>
            {FAQS.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.faqItem}
                  onPress={() => setExpandedFaq(isExpanded ? null : index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqQuestionText}>{faq.q}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#D97706"
                    />
                  </View>
                  {isExpanded && <Text style={styles.faqAnswerText}>{faq.a}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
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
                  (city === 'All of Australia' &&
                    (selectedCity === 'All Cities' || selectedCity === 'All of Australia')) ||
                  selectedCity === city;
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
    paddingTop: 12,
    gap: 14,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
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
  faqSection: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  faqList: {
    marginTop: 12,
    gap: 8,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  faqAnswerText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
});
