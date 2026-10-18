import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LocationStore } from '../../services/locationStore';
import Skeleton from '../../components/Skeleton';

import { API_BASE, BACKEND_HOST } from '../../constants/api';

function getFullImageUrl(path: string | undefined): string {
  if (!path) return 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80';
  if (path.startsWith('http')) return path;
  return `${BACKEND_HOST}${path}`;
}

export default function ExploreEventsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();

  const [categories, setCategories] = useState<string[]>(['All']);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [selectedCategory, setSelectedCategory] = useState(params.category || 'All');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState(LocationStore.getCity());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sync category param from navigation
  useEffect(() => {
    if (params.category) {
      const cat = Array.isArray(params.category) ? params.category[0] : params.category;
      if (cat) {
        setSelectedCategory(cat);
      }
    }
  }, [params.category]);

  // Sync search param from navigation
  useEffect(() => {
    if (params.q !== undefined) {
      const q = Array.isArray(params.q) ? params.q[0] : params.q;
      setSearchQuery(q);
    }
  }, [params.q]);

  useEffect(() => {
    LocationStore.init().then(city => setSelectedCity(city));
    const unsubscribe = LocationStore.subscribe(city => {
      setSelectedCity(city);
    });

    fetch(`${API_BASE}/categories`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data || []);
        if (list.length > 0) {
          setCategories(['All', ...list]);
        }
      })
      .catch(() => {});

    return unsubscribe;
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      let eventsArray: any[] = [];
      if (searchQuery.trim()) {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          eventsArray = data.results?.events || [];
        }
      } else {
        const res = await fetch(`${API_BASE}/events`);
        if (res.ok) {
          const data = await res.json();
          eventsArray = Array.isArray(data) ? data : (data.events || data.data || []);
        }
      }

      // Extract unique states configured by admin across venues
      const rawStates = eventsArray
        .map((e: any) => e.venue?.state?.trim().toUpperCase())
        .filter(Boolean);
      const uniqueStates = Array.from(new Set(rawStates)).sort() as string[];
      setAvailableStates(uniqueStates);

      // Filter by city
      if (selectedCity && selectedCity !== 'All Cities' && selectedCity !== 'All of Australia') {
        eventsArray = eventsArray.filter((e: any) =>
          e.venue?.city?.toLowerCase() === selectedCity.toLowerCase()
        );
      }

      // Filter by state
      if (selectedState) {
        eventsArray = eventsArray.filter((e: any) =>
          e.venue?.state?.toUpperCase() === selectedState.toUpperCase()
        );
      }

      // Filter by category
      if (selectedCategory && selectedCategory.trim().toLowerCase() !== 'all') {
        eventsArray = eventsArray.filter((e: any) =>
          e.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
        );
      }

      setEvents(eventsArray);
    } catch (err) {
      console.error('Error fetching events in explore:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedCity, selectedState, selectedCategory]);

  useEffect(() => {
    setLoading(true);
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedState('');
    LocationStore.setCity('All Cities');
  };

  const renderEventCard = ({ item }: { item: any }) => {
    const totalAvailable = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
    const totalCapacity = item.ticketTypes?.reduce((acc: number, t: any) => acc + (t.quantity ?? 0), 0) || 100;
    const minPrice = item.ticketTypes?.length
      ? Math.min(...item.ticketTypes.map((t: any) => t.priceCents || 0)) / 100
      : 0;

    const startsAt = (item.startsAt || item.startDate) ? new Date(item.startsAt || item.startDate) : null;
    const now = new Date();
    const isBookingClosed = startsAt ? now >= new Date(startsAt.getTime() - 60 * 60 * 1000) : false;
    const isSoldOut = totalAvailable <= 0;

    const formattedDate = startsAt
      ? startsAt.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'TBA';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push(`/event/${item.slug}`)}
      >
        <View style={styles.posterContainer}>
          <Image
            source={{ uri: getFullImageUrl(item.posterPath) }}
            style={styles.poster}
            resizeMode="cover"
          />

          {item.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
            </View>
          ) : null}

          {/* Bottom Badges on Poster */}
          <View style={styles.posterBottomBar}>
            {isBookingClosed ? (
              <View style={[styles.badgePill, { backgroundColor: 'rgba(15, 23, 42, 0.92)' }]}>
                <Text style={styles.badgePillText}>CLOSED</Text>
              </View>
            ) : isSoldOut ? (
              <View style={[styles.badgePill, { backgroundColor: 'rgba(220, 38, 38, 0.92)' }]}>
                <Text style={styles.badgePillText}>SOLD OUT</Text>
              </View>
            ) : (
              <View style={[styles.badgePill, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
                <View style={[styles.statusDot, { backgroundColor: totalAvailable <= 10 ? '#FB923C' : '#10B981' }]} />
                <Text style={styles.badgePillText}>
                  {totalAvailable}/{totalCapacity}
                </Text>
              </View>
            )}

            {minPrice > 0 && !isBookingClosed && !isSoldOut ? (
              <View style={styles.pricePill}>
                <Text style={styles.pricePillText}>${minPrice.toFixed(0)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.venue ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color="#D97706" />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.venue.name}{item.venue.city ? `, ${item.venue.city}` : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const hasFiltersActive =
    (selectedCity && selectedCity !== 'All Cities' && selectedCity !== 'All of Australia') ||
    selectedState !== '' ||
    selectedCategory !== 'All' ||
    searchQuery.trim() !== '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header (Clean White) */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Explore Events</Text>
            <Text style={styles.headerSubtitle}>Discover live experiences across Australia</Text>
          </View>
        </View>

        {/* Search Bar (White with soft border) */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, artists, venues..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={fetchEvents}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Active City indicator */}
        {selectedCity && selectedCity !== 'All Cities' && selectedCity !== 'All of Australia' ? (
          <View style={styles.activeCityRow}>
            <View style={styles.activeCityChip}>
              <Ionicons name="location" size={13} color="#D97706" />
              <Text style={styles.activeCityText}>In {selectedCity}</Text>
              <TouchableOpacity onPress={() => LocationStore.setCity('All Cities')}>
                <Ionicons name="close" size={14} color="#92400E" />
              </TouchableOpacity>
            </View>
            {hasFiltersActive ? (
              <TouchableOpacity onPress={handleClearFilters}>
                <Text style={styles.clearAllText}>Reset All</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Filter Horizontal Bars */}
      <View style={styles.filtersSection}>
        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {categories.map(cat => {
            const isSelected = selectedCategory?.trim().toLowerCase() === cat.trim().toLowerCase();
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dynamic States Pills (only shown if admin's events/venues have states) */}
        {availableStates.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterScroll, { paddingTop: 6, paddingBottom: 10 }]}
          >
            <TouchableOpacity
              style={[styles.stateChip, selectedState === '' && styles.stateChipActive]}
              onPress={() => setSelectedState('')}
            >
              <Text style={[styles.stateChipText, selectedState === '' && styles.stateChipTextActive]}>
                All States
              </Text>
            </TouchableOpacity>
            {availableStates.map(st => {
              const isSelected = selectedState === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.stateChip, isSelected && styles.stateChipActive]}
                  onPress={() => setSelectedState(st)}
                >
                  <Text style={[styles.stateChipText, isSelected && styles.stateChipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Event Grid / List */}
      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {[0, 1, 2].map((rowIndex) => (
            <View key={rowIndex} style={styles.columnWrapper}>
              {[0, 1].map((colIndex) => (
                <View key={colIndex} style={styles.card}>
                  <View style={styles.posterContainer}>
                    <Skeleton width="100%" height="100%" borderRadius={0} />
                    {/* Category pill placeholder */}
                    <View style={{ position: 'absolute', top: 8, left: 8 }}>
                      <Skeleton width={62} height={18} borderRadius={6} />
                    </View>
                    {/* Bottom badges placeholder */}
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        right: 8,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Skeleton width={58} height={18} borderRadius={6} />
                      <Skeleton width={32} height={18} borderRadius={6} />
                    </View>
                  </View>
                  <View style={styles.cardInfo}>
                    <Skeleton width="88%" height={15} borderRadius={4} style={{ marginBottom: 7 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Skeleton width={13} height={13} borderRadius={6} />
                      <Skeleton width="72%" height={11} borderRadius={4} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
                      <Skeleton width={13} height={13} borderRadius={6} />
                      <Skeleton width="52%" height={11} borderRadius={4} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="filter-outline" size={38} color="#D97706" />
          </View>
          <Text style={styles.emptyTitle}>No events found</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't find any events matching your selected filters. Try changing your city, state or category.
          </Text>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
            <Text style={styles.clearButtonText}>Clear all filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id || item.slug)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={renderEventCard}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F6C636"
              colors={['#F6C636']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 6,
    paddingBottom: 12,
  },
  headerTop: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  activeCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  activeCityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  activeCityText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  filtersSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#F6C636',
    fontWeight: '800',
  },
  stateChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stateChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  stateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stateChipTextActive: {
    color: '#F6C636',
    fontWeight: '800',
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 0.8,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
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
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  posterBottomBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pricePill: {
    backgroundColor: '#F6C636',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pricePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardInfo: {
    padding: 10,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
    marginBottom: 20,
  },
  clearButton: {
    backgroundColor: '#F6C636',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#F6C636',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
