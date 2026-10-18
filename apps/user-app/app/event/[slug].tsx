import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Skeleton from '../../components/Skeleton';
import SeatPicker from '../../components/SeatPicker';

const { width } = Dimensions.get('window');
import { API_BASE, BACKEND_HOST } from '../../constants/api';
import { getValidAuthToken, fetchWithAuth } from '../../services/auth';

function getFullImageUrl(path: string | undefined): string {
  if (!path) return 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80';
  if (path.startsWith('http')) return path;
  return `${BACKEND_HOST}${path}`;
}

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reserved Seating States
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seatTierMap, setSeatTierMap] = useState<Record<string, string>>({});
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [heldSeats, setHeldSeats] = useState<string[]>([]);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    let seatInterval: any = null;

    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${slug}`);
        let data: any = null;
        if (res.ok) {
          data = await res.json();
        }

        // If backend hasn't populated seatingConfig/seatingType, fallback to Supabase REST
        if (!data || !data.seatingConfig || !data.seatingType) {
          try {
            const sbRes = await fetch(
              `https://kfcocpzuzxpinqgnzhsq.supabase.co/rest/v1/events?slug=eq.${encodeURIComponent(slug)}&select=seating_type,seating_config`,
              {
                headers: {
                  apikey:
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmY29jcHp1enhwaW5xZ256aHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODk2NjgsImV4cCI6MjEwNjc2NTY2OH0.tDVNBk_Pi88UHQoWFQZMgjADTZf6PhGYFWAuynzJfMk',
                },
              }
            );
            if (sbRes.ok) {
              const sbRows = await sbRes.json();
              if (sbRows && sbRows[0]) {
                if (!data) data = {};
                data.seatingType = sbRows[0].seating_type || data.seatingType || 'GENERAL';
                data.seatingConfig = sbRows[0].seating_config || data.seatingConfig || null;
              }
            }
          } catch (e) {
            console.warn('Supabase fallback error:', e);
          }
        }

        setEvent(data);

        // If reserved seating, fetch booked & held seats
        if (data && data.seatingType === 'RESERVED') {
          const fetchSeatsStatus = async () => {
            try {
              const seatsRes = await fetch(`${API_BASE}/events/${slug}/seats`);
              if (seatsRes.ok) {
                const seatsData = await seatsRes.json();
                setBookedSeats(seatsData.bookedSeats || []);
                setHeldSeats(seatsData.heldSeats || []);
                return;
              }

              // Direct Supabase tickets fallback for booked seats
              const tRes = await fetch(
                `https://kfcocpzuzxpinqgnzhsq.supabase.co/rest/v1/tickets?select=seat_row,seat_number,section_name&status=neq.CANCELLED`,
                {
                  headers: {
                    apikey:
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmY29jcHp1enhwaW5xZ256aHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODk2NjgsImV4cCI6MjEwNjc2NTY2OH0.tDVNBk_Pi88UHQoWFQZMgjADTZf6PhGYFWAuynzJfMk',
                  },
                }
              );
              if (tRes.ok) {
                const tickets = await tRes.json();
                const booked = tickets
                  .filter((t: any) => t.seat_row && t.seat_number)
                  .map((t: any) => {
                    const sec = t.section_name || '';
                    return sec ? `${sec}:${t.seat_row}-${t.seat_number}` : `${t.seat_row}-${t.seat_number}`;
                  });
                setBookedSeats(booked);
              }
            } catch (err) {
              console.warn('Seats status error:', err);
            }
          };

          await fetchSeatsStatus();
          seatInterval = setInterval(fetchSeatsStatus, 10000);
        }
      } catch (err) {
        console.error(err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();

    return () => {
      if (seatInterval) clearInterval(seatInterval);
    };
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Stack.Screen options={{ headerShown: false }} />

        {/* Floating Back Button */}
        <View style={styles.floatingHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Edge-to-edge Poster Skeleton */}
          <View style={styles.posterContainer}>
            <Skeleton width="100%" height="100%" borderRadius={0} />
            {/* Category pill skeleton */}
            <View style={{ position: 'absolute', bottom: 16, left: 16 }}>
              <Skeleton width={80} height={24} borderRadius={20} />
            </View>
          </View>

          {/* Details Container with exact matching spacing */}
          <View style={styles.detailsContainer}>
            {/* Breadcrumb row */}
            <View style={{ marginBottom: 8 }}>
              <Skeleton width={160} height={12} borderRadius={4} />
            </View>

            {/* Event Title */}
            <View style={{ marginBottom: 20 }}>
              <Skeleton width="65%" height={32} borderRadius={8} />
            </View>

            {/* Date & Venue Cards */}
            <View style={styles.metaCardsRow}>
              {/* Date Card */}
              <View style={styles.metaCard}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width={80} height={10} borderRadius={3} />
                  <Skeleton width="75%" height={16} borderRadius={4} />
                  <Skeleton width="45%" height={12} borderRadius={4} />
                </View>
              </View>

              {/* Venue Card */}
              <View style={styles.metaCard}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width={60} height={10} borderRadius={3} />
                  <Skeleton width="65%" height={16} borderRadius={4} />
                  <Skeleton width="40%" height={12} borderRadius={4} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Bottom Bar */}
        <View style={styles.bottomBar}>
          <View style={{ gap: 4 }}>
            <Skeleton width={85} height={10} borderRadius={3} />
            <Skeleton width={110} height={22} borderRadius={6} />
          </View>
          <Skeleton width={140} height={48} borderRadius={14} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Event not found.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.back()}>
          <Text style={styles.backHomeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const startsAt = (event.startsAt || event.startDate) ? new Date(event.startsAt || event.startDate) : null;
  const now = new Date();
  const isBookingClosed = startsAt ? now >= new Date(startsAt.getTime() - 60 * 60 * 1000) : false;
  const totalAvailable = event.ticketTypes?.reduce((acc: number, t: any) => acc + (t.available ?? 0), 0) ?? 0;
  const isSoldOut = totalAvailable <= 0 && (event.ticketTypes?.length ?? 0) > 0;

  const minPrice = event.ticketTypes?.length
    ? Math.min(...event.ticketTypes.map((t: any) => t.priceCents || 0)) / 100
    : 0;

  const formattedDate = startsAt
    ? startsAt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date TBA';

  const formattedTime = startsAt
    ? startsAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'TBA';

  const handleToggleSeat = (seatKey: string, tierId: string) => {
    if (isBookingClosed) {
      Alert.alert('Booking Closed', 'Ticket sales have closed for this event.');
      return;
    }
    if (isSoldOut) {
      Alert.alert('Sold Out', 'All ticket allocations for this event are currently sold out.');
      return;
    }
    if (selectedSeats.includes(seatKey)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seatKey));
      setSeatTierMap((prev) => {
        const copy = { ...prev };
        delete copy[seatKey];
        return copy;
      });
    } else {
      if (selectedSeats.length >= 10) {
        Alert.alert('Limit Reached', 'Maximum 10 seats allowed per booking.');
        return;
      }
      setSelectedSeats((prev) => [...prev, seatKey]);
      setSeatTierMap((prev) => ({ ...prev, [seatKey]: tierId }));
    }
  };

  const reservedTotalPrice = selectedSeats.reduce((sum, sKey) => {
    const tierId = seatTierMap[sKey];
    const tier = event?.ticketTypes?.find((t: any) => t.id === tierId) || event?.ticketTypes?.[0];
    return sum + (tier ? (tier.priceCents || 0) / 100 : 0);
  }, 0);

  const handleBookTickets = async () => {
    if (isBookingClosed) {
      Alert.alert('Booking Closed', 'Ticket sales have closed for this event.');
      return;
    }
    if (isSoldOut) {
      Alert.alert('Sold Out', 'All ticket allocations for this event are currently sold out.');
      return;
    }

    const storedToken = await getValidAuthToken();
    if (!storedToken) {
      Alert.alert(
        'Login Required',
        'Please sign in or create an account to book tickets.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login / Register', onPress: () => router.push('/auth') },
        ]
      );
      return;
    }

    if (event.seatingType === 'RESERVED' && event.seatingConfig?.sections?.length > 0) {
      if (selectedSeats.length === 0) {
        Alert.alert('Select Your Seats', 'Please tap on the seat map above to select your seats first.');
        return;
      }

      const seatNames = selectedSeats
        .map((s) => (s.includes(':') ? s.split(':')[1] : s))
        .join(', ');

      Alert.alert(
        'Confirm Seat Booking',
        `Event: ${event.title}\nSeats: ${seatNames}\nTotal: $${reservedTotalPrice.toFixed(0)} AUD\n\nInstant digital tickets with fraud-proof QR pass will be issued to your account.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm & Book',
            onPress: async () => {
              setHolding(true);
              try {
                const primaryTierId = seatTierMap[selectedSeats[0]] || event.ticketTypes?.[0]?.id;

                // 1. Create Hold
                const holdRes = await fetchWithAuth(`${API_BASE}/holds`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    ticketTypeId: primaryTierId,
                    quantity: selectedSeats.length,
                    selectedSeats,
                  }),
                });

                const holdData = await holdRes.json();
                if (!holdRes.ok) {
                  throw new Error(holdData.error?.message || holdData.message || 'Seat reservation failed');
                }

                const holdId = holdData.data?.holdId || holdData.holdId;

                // 2. Complete Checkout to generate tickets
                const checkoutRes = await fetchWithAuth(`${API_BASE}/checkout`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    holdId,
                  }),
                });

                const checkoutData = await checkoutRes.json();
                if (!checkoutRes.ok && checkoutData.error?.code !== 'PAYMENT_GATEWAY_NOT_CONFIGURED') {
                  throw new Error(checkoutData.error?.message || checkoutData.message || 'Ticket creation failed');
                }

                setSelectedSeats([]);
                setSeatTierMap({});

                Alert.alert(
                  'Booking Confirmed! 🎉',
                  `Your digital entry passes for seats (${seatNames}) have been issued successfully!`,
                  [
                    {
                      text: 'View My Tickets',
                      onPress: () => router.push('/(tabs)/live'),
                    },
                    { text: 'OK', style: 'cancel' },
                  ]
                );
              } catch (e: any) {
                Alert.alert('Booking Error', e.message || 'Failed to complete booking. Please try again.');
              } finally {
                setHolding(false);
              }
            },
          },
        ]
      );
      return;
    }

    // General Admission flow
    const firstTier = event.ticketTypes?.[0];
    if (!firstTier) {
      Alert.alert('Error', 'No ticket allocation available.');
      return;
    }

    const priceAud = ((firstTier.priceCents || 0) / 100).toFixed(0);

    Alert.alert(
      'Confirm Ticket Booking',
      `Event: ${event.title}\nTicket: ${firstTier.name || 'General Admission'}\nPrice: $${priceAud} AUD\n\nInstant digital ticket with fraud-proof QR pass will be issued to your account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Book',
          onPress: async () => {
            setHolding(true);
            try {
              // 1. Create Hold
              const holdRes = await fetchWithAuth(`${API_BASE}/holds`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ticketTypeId: firstTier.id,
                  quantity: 1,
                }),
              });

              const holdData = await holdRes.json();
              if (!holdRes.ok) {
                throw new Error(holdData.error?.message || holdData.message || 'Failed to reserve ticket');
              }

              const holdId = holdData.data?.holdId || holdData.holdId;

              // 2. Complete Checkout to generate tickets
              const checkoutRes = await fetchWithAuth(`${API_BASE}/checkout`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  holdId,
                }),
              });

              const checkoutData = await checkoutRes.json();
              if (!checkoutRes.ok && checkoutData.error?.code !== 'PAYMENT_GATEWAY_NOT_CONFIGURED') {
                throw new Error(checkoutData.error?.message || checkoutData.message || 'Ticket creation failed');
              }

              Alert.alert(
                'Booking Confirmed! 🎉',
                `Your digital entry pass for "${event.title}" has been issued successfully!`,
                [
                  {
                    text: 'View My Tickets',
                    onPress: () => router.push('/(tabs)/live'),
                  },
                  { text: 'OK', style: 'cancel' },
                ]
              );
            } catch (e: any) {
              Alert.alert('Booking Error', e.message || 'Failed to complete booking. Please try again.');
            } finally {
              setHolding(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Floating Back Button */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Poster */}
        <View style={styles.posterContainer}>
          <Image
            source={{ uri: getFullImageUrl(event.posterPath) }}
            style={styles.poster}
            resizeMode="cover"
          />
          {event.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{event.category.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        {/* Content Container */}
        <View style={styles.detailsContainer}>
          {/* Breadcrumb row */}
          <Text style={styles.breadcrumb}>Home / Events / {event.category || 'Live'}</Text>

          {/* Event Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Date & Venue Cards */}
          <View style={styles.metaCardsRow}>
            {/* Date Card */}
            <View style={styles.metaCard}>
              <View style={styles.metaIconBox}>
                <Ionicons name="calendar" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaCardLabel}>DATE & TIME</Text>
                <Text style={styles.metaCardPrimary}>{formattedDate}</Text>
                <Text style={styles.metaCardSecondary}>Doors: {formattedTime}</Text>
              </View>
            </View>

            {/* Venue Card */}
            <View style={styles.metaCard}>
              <View style={styles.metaIconBox}>
                <Ionicons name="location" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaCardLabel}>VENUE</Text>
                <Text style={styles.metaCardPrimary}>
                  {event.venue?.name || 'Venue TBA'}
                </Text>
                <Text style={styles.metaCardSecondary}>
                  {event.venue?.city ? `${event.venue.city} ${event.venue?.state || ''}` : 'Australia'}
                </Text>
              </View>
            </View>
          </View>

          {/* Trust Guarantees */}
          <View style={styles.trustBanner}>
            <View style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={18} color="#D97706" />
              <Text style={styles.trustText}>Every booking confirmed by our Australian team</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="ticket" size={18} color="#D97706" />
              <Text style={styles.trustText}>Official digital pass with verifiable QR code</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="call" size={18} color="#D97706" />
              <Text style={styles.trustText}>Questions or special requests? Call 0455 600 003</Text>
            </View>
          </View>

          {/* Interactive Seat Picker (Numbered Seating) OR Ticket Options (General Admission) */}
          {event.seatingType === 'RESERVED' && event.seatingConfig?.sections?.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Select Your Seats</Text>
                <View style={styles.numberedBadge}>
                  <Text style={styles.numberedBadgeText}>NUMBERED SEATING</Text>
                </View>
              </View>

              <SeatPicker
                config={event.seatingConfig}
                ticketTypes={event.ticketTypes || []}
                selectedSeats={selectedSeats}
                onToggleSeat={handleToggleSeat}
                bookedSeats={bookedSeats}
                heldSeats={heldSeats}
                maxSeats={10}
                disabled={isBookingClosed || isSoldOut}
              />
            </View>
          ) : (
            /* Ticket Options Section (General Admission) */
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ticket Options</Text>
              {event.ticketTypes && event.ticketTypes.length > 0 ? (
                event.ticketTypes.map((tier: any, index: number) => {
                  const tierPrice = (tier.priceCents || 0) / 100;
                  const tierAvailable = tier.available ?? 0;
                  const tierSoldOut = tierAvailable <= 0;
                  return (
                    <View key={tier.id || index} style={styles.ticketTierCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tierName}>{tier.name || 'General Admission'}</Text>
                        <Text style={styles.tierSeats}>
                          {tierSoldOut ? 'Sold out' : `${tierAvailable} seats available`}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.tierPrice}>${tierPrice.toFixed(0)} AUD</Text>
                        {tierSoldOut ? (
                          <View style={styles.tierSoldOutBadge}>
                            <Text style={styles.tierSoldOutText}>Sold Out</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.ticketTierCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierName}>Standard Admission</Text>
                    <Text style={styles.tierSeats}>General Entry</Text>
                  </View>
                  <Text style={styles.tierPrice}>${minPrice > 0 ? minPrice.toFixed(0) : 'TBA'} AUD</Text>
                </View>
              )}
            </View>
          )}

          {/* About The Event */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About The Event</Text>
            <Text style={styles.description}>
              {event.description || 'Join us for this premier live event in Australia.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>
            {event.seatingType === 'RESERVED' && selectedSeats.length > 0
              ? `${selectedSeats.length} SEAT${selectedSeats.length > 1 ? 'S' : ''} SELECTED`
              : 'TICKETS FROM'}
          </Text>
          <Text style={styles.bottomPriceValue}>
            {isBookingClosed
              ? 'Closed'
              : isSoldOut
              ? 'Sold Out'
              : event.seatingType === 'RESERVED' && selectedSeats.length > 0
              ? `$${reservedTotalPrice.toFixed(0)} AUD`
              : minPrice > 0
              ? `$${minPrice.toFixed(0)} AUD`
              : 'Free'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            (isBookingClosed ||
              isSoldOut ||
              (event.seatingType === 'RESERVED' && selectedSeats.length === 0)) &&
              styles.bookButtonDisabled,
          ]}
          onPress={handleBookTickets}
          disabled={isBookingClosed || isSoldOut}
          activeOpacity={0.8}
        >
          <Text style={styles.bookButtonText}>
            {isBookingClosed
              ? 'Booking Closed'
              : isSoldOut
              ? 'Sold Out'
              : event.seatingType === 'RESERVED'
              ? selectedSeats.length > 0
                ? `Book ${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''}`
                : 'Select Seats'
              : 'Book Tickets'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 16,
  },
  backHomeBtn: {
    backgroundColor: '#F6C636',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backHomeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 16,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  posterContainer: {
    width: width,
    height: width * 1.15,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  categoryPill: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#F6C636',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  breadcrumb: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 32,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  metaCardsRow: {
    gap: 12,
    marginBottom: 20,
  },
  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  metaIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  metaCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  metaCardPrimary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  metaCardSecondary: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  trustBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
    marginBottom: 24,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trustText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  numberedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  numberedBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  ticketTierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  tierSeats: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tierPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#D97706',
  },
  tierSoldOutBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  tierSoldOutText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '400',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomPriceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D97706',
    marginTop: 2,
  },
  bookButton: {
    backgroundColor: '#F6C636',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#F6C636',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  bookButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  bookButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
});
