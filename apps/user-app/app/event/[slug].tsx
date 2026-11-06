import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Skeleton from '../../components/Skeleton';
import SeatPicker, { seatedTierNamesOf } from '../../components/SeatPicker';

const { width } = Dimensions.get('window');
import { API_BASE, BACKEND_HOST } from '../../constants/api';
import { getValidAuthToken, fetchWithAuth } from '../../services/auth';

/** Parses a JSON body, tolerating HTML/empty error pages (e.g. while the server is waking up). */
async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return { message: res.ok ? '' : `Server error (${res.status}). Please try again in a moment.` };
  }
}

function getFullImageUrl(path: string | undefined): string {
  if (!path) return 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80';
  if (path.startsWith('http')) return path;
  return `${BACKEND_HOST}${path}`;
}

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0
  );
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reserved Seating States
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seatTierMap, setSeatTierMap] = useState<Record<string, string>>({});
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [heldSeats, setHeldSeats] = useState<string[]>([]);
  const [holding, setHolding] = useState(false);

  // General Admission States
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  useEffect(() => {
    let seatInterval: ReturnType<typeof setInterval> | null = null;
    // Set on unmount/slug change; async work that finishes later must not start timers or set state.
    let cancelled = false;

    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${slug}`);
        let data: any = null;
        if (res.ok) {
          data = await res.json();
        }
        if (cancelled) return;

        setEvent(data);
        if (data?.ticketTypes?.length) {
          const firstAvailable = data.ticketTypes.find((t: any) => (t.available ?? 0) > 0) || data.ticketTypes[0];
          if (firstAvailable?.id) {
            setSelectedTierId(firstAvailable.id);
          }
        }

        // If reserved seating, fetch booked & held seats
        if (data && data.seatingType === 'RESERVED') {
          const fetchSeatsStatus = async () => {
            try {
              const seatsRes = await fetch(`${API_BASE}/events/${slug}/seats`);
              if (!seatsRes.ok || cancelled) return;
              const seatsData = await seatsRes.json();
              if (cancelled) return;
              setBookedSeats(seatsData.bookedSeats || []);
              setHeldSeats(seatsData.heldSeats || []);

            } catch (err) {
              console.warn('Seats status error:', err);
            }
          };

          await fetchSeatsStatus();
          // Only start polling if the screen is still open after the first (awaited) fetch.
          if (!cancelled) {
            seatInterval = setInterval(fetchSeatsStatus, 10000);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setEvent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvent();

    return () => {
      cancelled = true;
      if (seatInterval) clearInterval(seatInterval);
    };
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Stack.Screen options={{ headerShown: false }} />

        {/* Floating Back Button */}
        <View style={[styles.floatingHeader, { top: topInset + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView scrollEnabled={false} bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={{ gap: 4 }}>
            <Skeleton width={85} height={10} borderRadius={3} />
            <Skeleton width={110} height={22} borderRadius={6} />
          </View>
          <Skeleton width={140} height={48} borderRadius={14} />
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Event not found.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.back()}>
          <Text style={styles.backHomeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
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

  const handleOpenMap = () => {
    if (!event?.venue) return;
    const venueName = event.venue.name || '';
    const venueAddress = event.venue.address || '';
    const venueCity = event.venue.city || '';
    const venueState = event.venue.state || '';

    const queryParts = [venueName, venueAddress, venueCity, venueState, 'Australia']
      .filter((part) => Boolean(part && String(part).trim()));
    const fullQuery = queryParts.join(', ');
    const encoded = encodeURIComponent(fullQuery);

    const mapUrl = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    });

    Linking.openURL(mapUrl!).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    });
  };

  const handleShareEvent = async () => {
    if (!event) return;
    try {
      const shareUrl = `https://mytix.com.au/events/${event.slug || slug}`;
      const venueStr = event.venue?.name ? `${event.venue.name}, ${event.venue?.city || 'Australia'}` : 'Australia';
      const message = `🎟️ Join me at "${event.title}"!\n\n📅 Date: ${formattedDate} (${formattedTime})\n📍 Venue: ${venueStr}\n\nBook verified tickets on Mytix:\n${shareUrl}`;

      await Share.share({
        title: event.title,
        message,
        url: shareUrl,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  // A real seat map only exists when the organiser configured sections; otherwise book as general admission.
  const hasSeatMap = event.seatingType === 'RESERVED' && event.seatingConfig?.sections?.length > 0;

  // Which ticket categories are numbered seats and which are bought by quantity.
  // v2 seat maps list seated sections explicitly (standing zones are sold by quantity);
  // older seat maps treat every category as seated.
  const tierKey = (name: unknown) => String(name || '').trim().toLowerCase();
  const seatedTierKeys = new Set<string>(
    !hasSeatMap
      ? []
      : event.seatingConfig.version === 2
      ? seatedTierNamesOf(event.seatingConfig)
      : (event.ticketTypes || []).map((t: any) => tierKey(t.name))
  );
  const quantityTiers: any[] = (event.ticketTypes || []).filter((t: any) => !seatedTierKeys.has(tierKey(t.name)));
  const isSeatSelection = selectedSeats.length > 0;

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
      const quantityTickets = selectedTierId && hasSeatMap ? selectedQuantity : 0;
      if (selectedSeats.length + quantityTickets >= 10) {
        Alert.alert('Limit Reached', 'Maximum 10 tickets allowed per booking.');
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

  // Quantity-based category in use. With a seat map the buyer must pick one explicitly.
  const activeTier =
    quantityTiers.find((t: any) => t.id === selectedTierId) ||
    (!hasSeatMap ? quantityTiers.find((t: any) => (t.available ?? 0) > 0) || quantityTiers[0] : undefined);
  const gaUnitPrice = activeTier ? (activeTier.priceCents || 0) / 100 : 0;
  const gaTotalPrice = gaUnitPrice * selectedQuantity;

  /** One booking can mix seats from several categories and a standing/general ticket. */
  const basketItems: Array<{ ticketTypeId: string; quantity: number; selectedSeats?: string[] }> = [];
  for (const sKey of selectedSeats) {
    const tierId = seatTierMap[sKey] || event.ticketTypes?.[0]?.id;
    const line = basketItems.find((l) => l.ticketTypeId === tierId);
    if (line) {
      line.quantity += 1;
      line.selectedSeats!.push(sKey);
    } else {
      basketItems.push({ ticketTypeId: tierId, quantity: 1, selectedSeats: [sKey] });
    }
  }
  if (activeTier) basketItems.push({ ticketTypeId: activeTier.id, quantity: selectedQuantity });
  const basketCount = basketItems.reduce((sum, l) => sum + l.quantity, 0);
  const basketTotal = reservedTotalPrice + (activeTier ? gaTotalPrice : 0);

  const promptLogin = (message = 'Please sign in or create an account to book tickets.') => {
    Alert.alert('Login Required', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Login / Register', onPress: () => router.push('/auth') },
    ]);
  };

  /**
   * Reserve the tickets on the server, then open checkout. Checkout shows the live
   * reservation countdown and the exact price, and releases the hold if the user leaves.
   * The server may hand back an existing active hold for this event instead of a new one;
   * checkout always shows what the server actually holds.
   */
  const reserveAndCheckout = async (holdBody: Record<string, unknown>) => {
    setHolding(true);
    try {
      const holdRes = await fetchWithAuth(`${API_BASE}/holds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holdBody),
      });
      if (holdRes.status === 401) {
        promptLogin('Your session has expired. Please sign in again to book tickets.');
        return;
      }
      const holdData = await readJson(holdRes);
      if (!holdRes.ok) {
        throw new Error(holdData.error?.message || holdData.message || 'Ticket reservation failed');
      }
      const holdId = holdData.data?.holdId || holdData.holdId;
      if (!holdId) throw new Error('Ticket reservation failed');

      router.push({
        pathname: '/checkout',
        params: { holdId, existing: holdData.data?.existing ? '1' : '0' },
      });
    } catch (e: any) {
      Alert.alert('Booking Error', e.message || 'Failed to reserve tickets. Please try again.');
    } finally {
      setHolding(false);
    }
  };

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
      promptLogin();
      return;
    }

    if (selectedSeats.length > 0) {
      if (activeTier && selectedQuantity > (activeTier.available ?? 0)) {
        Alert.alert('Insufficient Tickets', `Only ${activeTier.available ?? 0} ${activeTier.name} tickets available.`);
        return;
      }
      // Single category keeps the classic body; several categories are reserved together as `items`
      await reserveAndCheckout(basketItems.length === 1 ? basketItems[0] : { items: basketItems });
      return;
    }

    // Quantity flow (general admission / standing areas)
    const targetTier = activeTier;
    if (!targetTier) {
      if (hasSeatMap) {
        Alert.alert(
          'Select Your Seats',
          quantityTiers.length > 0
            ? 'Tap seats on the map, or choose a standing / general ticket below.'
            : 'Please tap on the seat map above to select your seats first.'
        );
      } else {
        Alert.alert('Error', 'No ticket allocation available.');
      }
      return;
    }

    const availableSeats = targetTier.available ?? 0;
    if (availableSeats <= 0) {
      Alert.alert('Tier Sold Out', 'The selected ticket tier is sold out. Please select another tier.');
      return;
    }

    if (selectedQuantity > availableSeats) {
      Alert.alert('Insufficient Tickets', `Only ${availableSeats} tickets available for this tier.`);
      return;
    }

    await reserveAndCheckout({ ticketTypeId: targetTier.id, quantity: selectedQuantity });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Floating Header (Back & Share Buttons) */}
      <View style={[styles.floatingHeader, { top: topInset + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShareEvent} style={styles.shareButton} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={20} color="#0F172A" />
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

            {/* Venue Card with Direct Maps Directions */}
            <TouchableOpacity
              style={styles.metaCard}
              onPress={handleOpenMap}
              activeOpacity={0.7}
            >
              <View style={styles.metaIconBox}>
                <Ionicons name="location" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.metaCardHeaderRow}>
                  <Text style={styles.metaCardLabel}>VENUE</Text>
                  <View style={styles.directionsBadge}>
                    <Ionicons name="navigate" size={10} color="#D97706" />
                    <Text style={styles.directionsBadgeText}>Directions</Text>
                  </View>
                </View>
                <Text style={styles.metaCardPrimary}>
                  {event.venue?.name || 'Venue TBA'}
                </Text>
                <Text style={styles.metaCardSecondary}>
                  {event.venue?.city ? `${event.venue.city} ${event.venue?.state || ''}` : 'Australia'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.trustItem}
              onPress={() => Linking.openURL('mailto:support@mytix.com.au')}
              activeOpacity={0.7}
            >
              <Ionicons name="mail" size={18} color="#D97706" />
              <Text style={[styles.trustText, { textDecorationLine: 'underline' }]}>
                Questions or special requests? support@mytix.com.au
              </Text>
            </TouchableOpacity>
          </View>

          {/* Interactive Seat Picker (Numbered Seating) OR Ticket Options (General Admission) */}
          {hasSeatMap && (
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
          )}

          {(!hasSeatMap || quantityTiers.length > 0) && (
            /* Ticket Options Section (General Admission / standing areas) */
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{hasSeatMap ? 'Standing & General' : 'Select Tickets'}</Text>
                <View style={styles.generalBadge}>
                  <Text style={styles.generalBadgeText}>{hasSeatMap ? 'NO SEAT NUMBER' : 'GENERAL ADMISSION'}</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                Select a tier and choose your ticket quantity (max 10).
              </Text>

              {quantityTiers.length > 0 ? (
                quantityTiers.map((tier: any, index: number) => {
                  const tierPrice = (tier.priceCents || 0) / 100;
                  const tierAvailable = tier.available ?? 0;
                  const tierSoldOut = tierAvailable <= 0;
                  const isSelected = selectedTierId === tier.id;
                  // Most this tier allows in one order: the per-order limit, capped by what is left.
                  const tierMax = Math.max(1, Math.min(10, tier.maxPerOrder || 10, tierAvailable));
                  const atMax = selectedQuantity >= tierMax;

                  return (
                    <TouchableOpacity
                      key={tier.id || index}
                      style={[
                        styles.ticketTierCard,
                        isSelected && !tierSoldOut && styles.ticketTierCardSelected,
                        tierSoldOut && styles.ticketTierCardDisabled,
                      ]}
                      onPress={() => {
                        if (!tierSoldOut && isSelected && hasSeatMap) {
                          // With a seat map the standing/general ticket is optional: tap again to remove it
                          setSelectedTierId('');
                          return;
                        }
                        if (!tierSoldOut && !isSelected) {
                          setSelectedTierId(tier.id);
                          // A quantity picked for another tier may exceed what this one allows.
                          setSelectedQuantity((q) => Math.min(q, Math.max(1, Math.min(10, tier.maxPerOrder || 10, tierAvailable))));
                        }
                      }}
                      activeOpacity={tierSoldOut ? 1 : 0.7}
                      disabled={tierSoldOut}
                    >
                      <View style={styles.tierRadioRow}>
                        <View
                          style={[
                            styles.tierRadioCircle,
                            isSelected && !tierSoldOut && styles.tierRadioCircleSelected,
                          ]}
                        >
                          {isSelected && !tierSoldOut && <View style={styles.tierRadioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.tierName, isSelected && styles.tierNameSelected]}>
                            {tier.name || 'General Admission'}
                          </Text>
                          <Text style={styles.tierSeats}>
                            {tierSoldOut ? 'Sold out' : `${tierAvailable} tickets remaining`}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.tierPrice}>${tierPrice.toFixed(2)} AUD</Text>
                          {tierSoldOut ? (
                            <View style={styles.tierSoldOutBadge}>
                              <Text style={styles.tierSoldOutText}>Sold Out</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {/* Stepper only shown on selected active tier */}
                      {isSelected && !tierSoldOut && (
                        <View style={styles.tierStepperRow}>
                          <Text style={styles.stepperLabel}>Quantity</Text>
                          <View style={styles.stepperControl}>
                            <TouchableOpacity
                              style={[styles.stepperBtn, selectedQuantity <= 1 && styles.stepperBtnDisabled]}
                              onPress={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                              disabled={selectedQuantity <= 1}
                              activeOpacity={0.6}
                            >
                              <Ionicons
                                name="remove"
                                size={18}
                                color={selectedQuantity <= 1 ? '#94A3B8' : '#0F172A'}
                              />
                            </TouchableOpacity>
                            <Text style={styles.stepperValue}>{selectedQuantity}</Text>
                            <TouchableOpacity
                              style={[
                                styles.stepperBtn,
                                atMax &&
                                  styles.stepperBtnDisabled,
                              ]}
                              onPress={() =>
                                setSelectedQuantity((q) =>
                                  Math.min(tierMax, q + 1)
                                )
                              }
                              disabled={atMax}
                              activeOpacity={0.6}
                            >
                              <Ionicons
                                name="add"
                                size={18}
                                color={
                                  atMax
                                    ? '#94A3B8'
                                    : '#0F172A'
                                }
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.ticketTierCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierName}>Standard Admission</Text>
                    <Text style={styles.tierSeats}>General Entry</Text>
                  </View>
                  <Text style={styles.tierPrice}>${minPrice > 0 ? minPrice.toFixed(2) : 'TBA'} AUD</Text>
                </View>
              )}
            </View>
          )}

          {/* Performing Artists / Lineup */}
          {event.artists && event.artists.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Artist Lineup</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.artistsScrollContainer}
              >
                {event.artists.map((item: any, idx: number) => {
                  const art = item.artist || item;
                  return (
                    <View key={art.id || idx} style={styles.artistCard}>
                      <Image
                        source={{ uri: getFullImageUrl(art.imagePath) }}
                        style={styles.artistAvatar}
                        resizeMode="cover"
                      />
                      <Text style={styles.artistName} numberOfLines={1}>
                        {art.name || 'Artist'}
                      </Text>
                      {item.isHeadline ? (
                        <View style={styles.headlinerBadge}>
                          <Text style={styles.headlinerBadgeText}>HEADLINER</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* About The Event */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About The Event</Text>
            <Text style={styles.description}>
              {event.description || 'Join us for this premier live event in Australia.'}
            </Text>
          </View>

          {/* Organiser Info */}
          {event.organiser?.businessName ? (
            <View style={styles.organiserContainer}>
              <View style={styles.organiserIconBox}>
                <Ionicons name="business" size={16} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.organiserLabel}>EVENT ORGANISER</Text>
                <Text style={styles.organiserName}>{event.organiser.businessName}</Text>
              </View>
              <View style={styles.verifiedOrganiserBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#166534" />
                <Text style={styles.verifiedOrganiserText}>Verified</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <Text style={styles.bottomPriceLabel}>
            {basketCount > 0
              ? `${basketCount} TICKET${basketCount > 1 ? 'S' : ''} SELECTED`
              : 'TICKETS FROM'}
          </Text>
          <Text style={styles.bottomPriceValue}>
            {isBookingClosed
              ? 'Closed'
              : isSoldOut
              ? 'Sold Out'
              : basketCount > 0
              ? `$${basketTotal.toFixed(2)} + fees`
              : minPrice > 0
              ? `$${minPrice.toFixed(2)} AUD`
              : 'Free'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            (isBookingClosed ||
              isSoldOut ||
              (!isSeatSelection && (!activeTier || (activeTier.available ?? 0) <= 0))) &&
              styles.bookButtonDisabled,
          ]}
          onPress={handleBookTickets}
          disabled={
            isBookingClosed ||
            isSoldOut ||
            (!isSeatSelection && (!activeTier || (activeTier.available ?? 0) <= 0)) ||
            holding
          }
          activeOpacity={0.8}
        >
          {holding ? (
            <ActivityIndicator color="#0F172A" size="small" />
          ) : (
            <Text style={styles.bookButtonText}>
              {isBookingClosed
                ? 'Booking Closed'
                : isSoldOut
                ? 'Sold Out'
                : basketCount > 0
                ? `Book ${basketCount} Ticket${basketCount > 1 ? 's' : ''}`
                : 'Select Seats'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'box-none',
  },
  shareButton: {
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
  metaCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  directionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  directionsBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.2,
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
  generalBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  generalBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    marginTop: -4,
  },
  ticketTierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  ticketTierCardSelected: {
    borderColor: '#F6C636',
    backgroundColor: '#FFFDF5',
  },
  ticketTierCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
  },
  tierRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRadioCircleSelected: {
    borderColor: '#F6C636',
  },
  tierRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F6C636',
  },
  tierName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  tierNameSelected: {
    color: '#0F172A',
    fontWeight: '900',
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
  tierStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.5,
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    minWidth: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '400',
  },
  artistsScrollContainer: {
    paddingVertical: 4,
    gap: 14,
  },
  artistCard: {
    alignItems: 'center',
    width: 82,
  },
  artistAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#F1F5F9',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  artistName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  headlinerBadge: {
    marginTop: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  headlinerBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.4,
  },
  organiserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  organiserIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organiserLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  organiserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  verifiedOrganiserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedOrganiserText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
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
