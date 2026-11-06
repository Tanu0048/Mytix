import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-qr-code';

import { API_BASE } from '../../constants/api';
import { formatSeatLabel } from '../../components/SeatPicker';
import { fetchWithAuth, fetchFreshUserProfile } from '../../services/auth';

export default function MyTicketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0
  );
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAuthAndTickets = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('token');

      if (!storedUser) {
        setUser(null);
        setToken(null);
        setTickets([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setToken(storedToken);

      // Silently sync fresh user profile in background so edits reflect across tabs
      fetchFreshUserProfile().then((fresh) => {
        if (fresh) setUser(fresh);
      }).catch(() => {});

      let fetchedTickets: any[] = [];
      const ticketMap = new Map<string, any>();

      // 1. Try backend API with auto-refreshing auth token
      try {
        const res = await fetchWithAuth(`${API_BASE}/me/tickets`);
        if (res.ok) {
          const data = await res.json();
          const list = data.data || data.tickets || [];
          if (Array.isArray(list)) {
            list.forEach((t: any) => {
              if (t && t.id) ticketMap.set(String(t.id), t);
            });
          }
        }
      } catch (e) {
        console.warn('Backend tickets fetch failed, falling back to Supabase:', e);
      }

      fetchedTickets = Array.from(ticketMap.values());
      setTickets(fetchedTickets);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAuthAndTickets();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAuthAndTickets();
  };

  const renderTicketCard = ({ item }: { item: any }) => {
    const orderObj = item.order || item.orders || {};
    const event = orderObj.event || orderObj.events || item.event || {};
    const venue = event.venue || event.venues || {};
    const rawDate = event.startsAt || event.starts_at;
    const eventDate = rawDate ? new Date(rawDate) : null;
    const formattedDate = eventDate
      ? eventDate.toLocaleDateString('en-AU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Date TBA';
    const formattedTime = eventDate
      ? eventDate.toLocaleTimeString('en-AU', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : 'TBA';

    const qrData = item.qrTokenHash || item.qr_token_hash || item.id || 'MYTIX-PASS';

    const shortId = (item.id || 'PASS').slice(0, 8).toUpperCase();

    const handleShareTicketPass = async (ticketItem: any) => {
      try {
        const orderObj = ticketItem.order || ticketItem.orders || {};
        const ev = orderObj.event || orderObj.events || ticketItem.event || {};
        const ven = ev.venue || ev.venues || {};
        const rawD = ev.startsAt || ev.starts_at;
        const fDate = rawD
          ? new Date(rawD).toLocaleDateString('en-AU', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'Date TBA';
        const fTime = rawD
          ? new Date(rawD).toLocaleTimeString('en-AU', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : 'TBA';

        // Only event details are shared. The QR token is the ticket itself, so it never leaves
        // the device (anyone holding it could get in at the gate).
        const shareText = `🎟️ I'm going to ${ev.title || 'an event'}!\n\nDate: ${fDate} at ${fTime}\nVenue: ${ven.name || 'Venue TBA'}, ${ven.city || 'Australia'}\n\nGet your tickets on Mytix.`;

        await Share.share({
          title: ev.title || 'Mytix event',
          message: shareText,
        });
      } catch (e) {
        console.warn('Share ticket pass error:', e);
      }
    };

    const rawRow = item.seatRow || item.seat_row;
    const rawNum = item.seatNumber || item.seat_number;
    const cleanRow = rawRow ? (rawRow.includes(':') ? rawRow.split(':')[1] : rawRow) : null;
    // "A4" for rows, "Table 3 · Seat 2" for tables
    const seatLabel = cleanRow && rawNum ? formatSeatLabel(`${cleanRow}-${rawNum}`) : null;

    return (
      <View style={styles.ticketCard}>
        {/* Top Section */}
        <View style={styles.ticketTop}>
          <View style={styles.statusBadgeRow}>
            {/* Only VALID tickets get in; USED/CANCELLED/REFUNDED are shown in red, never as "confirmed". */}
            <View style={[styles.statusBadge, item.status !== 'VALID' && styles.statusBadgeInactive]}>
              <Text style={[styles.statusBadgeText, item.status !== 'VALID' && styles.statusBadgeTextInactive]}>
                {item.status || 'UNKNOWN'}
              </Text>
            </View>
            {seatLabel ? (
              <View style={styles.seatBadge}>
                <Ionicons name="tablet-landscape-outline" size={11} color="#92400E" />
                <Text style={styles.seatBadgeText}>SEAT {seatLabel}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.ticketEventTitle} numberOfLines={2}>
            {event.title || 'Event Pass'}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaIconCircle}>
              <Ionicons name="calendar" size={14} color="#D97706" />
            </View>
            <View>
              <Text style={styles.metaPrimary}>{formattedDate}</Text>
              <Text style={styles.metaSecondary}>{formattedTime}</Text>
            </View>
          </View>

          {venue.name ? (
            <TouchableOpacity
              style={styles.metaRow}
              onPress={() => {
                const vName = venue.name || '';
                const vCity = venue.city || '';
                const vState = venue.state || '';
                const full = [vName, vCity, vState, 'Australia'].filter(Boolean).join(', ');
                const enc = encodeURIComponent(full);
                const url = Platform.select({
                  ios: `maps:0,0?q=${enc}`,
                  android: `geo:0,0?q=${enc}`,
                  default: `https://www.google.com/maps/search/?api=1&query=${enc}`,
                });
                Linking.openURL(url!).catch(() => {
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${enc}`);
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.metaIconCircle}>
                <Ionicons name="location" size={14} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaPrimary}>{venue.name}</Text>
                <Text style={styles.metaSecondary}>{venue.city || 'Australia'}</Text>
              </View>
              <Ionicons name="navigate-outline" size={14} color="#D97706" />
            </TouchableOpacity>
          ) : null}

          <View style={styles.attendeeRow}>
            <View style={styles.metaIconCircle}>
              <Ionicons name="person" size={14} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaPrimary}>
                {item.attendeeName || item.attendee_name || user?.name || 'Attendee'}
              </Text>
              <Text style={styles.ticketIdText}>Pass ID: {shortId}</Text>
            </View>
          </View>
        </View>

        {/* Perforated Tear Line */}
        <View style={styles.tearLineContainer}>
          <View style={[styles.cutoutCircle, styles.cutoutLeft]} />
          <View style={styles.dashedDivider} />
          <View style={[styles.cutoutCircle, styles.cutoutRight]} />
        </View>

        {/* Bottom QR Section */}
        <View style={styles.ticketBottom}>
          <View style={styles.qrContainer}>
            {/* Drawn on the device: the QR token is the ticket, so it must never be sent to a third-party service. */}
            <QRCode value={qrData} size={styles.qrImage.width} bgColor="#FFFFFF" fgColor="#0F172A" />
          </View>
          <View style={styles.scanBadge}>
            <Ionicons name="scan-outline" size={14} color="#0F172A" />
            <Text style={styles.scanBadgeText}>Scan this code at the gate</Text>
          </View>

          <TouchableOpacity
            style={styles.sharePassButton}
            onPress={() => handleShareTicketPass(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={15} color="#0F172A" />
            <Text style={styles.sharePassButtonText}>Share Event with Friends</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header (Clean White with Safe Area Spacing) */}
      <View style={[styles.header, { paddingTop: topInset + (Platform.OS === 'android' ? 6 : 4) }]}>
        <View style={styles.headerIconCircle}>
          <Ionicons name="ticket" size={20} color="#D97706" />
        </View>
        <View>
          <Text style={styles.headerTitle}>My Tickets</Text>
          <Text style={styles.headerSubtitle}>Digital passes and entry QR codes</Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F6C636" />
          <Text style={styles.loadingText}>Loading your passes...</Text>
        </View>
      ) : !user ? (
        /* Guest View */
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="lock-closed-outline" size={40} color="#D97706" />
          </View>
          <Text style={styles.emptyTitle}>Sign In to View Tickets</Text>
          <Text style={styles.emptySubtitle}>
            Please log in to your Mytix account to access your booked tickets and entry passes.
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/auth')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Login / Register</Text>
          </TouchableOpacity>
        </View>
      ) : tickets.length === 0 ? (
        /* Logged In but No Tickets */
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="ticket-outline" size={44} color="#D97706" />
          </View>
          <Text style={styles.emptyTitle}>No tickets found</Text>
          <Text style={styles.emptySubtitle}>
            Signed in as {user.email || 'User'}. No tickets booked on this account yet.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/movies')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Explore Events</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F1F5F9' }]}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, { color: '#0F172A' }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Tickets List */
        <FlatList
          data={tickets}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderTicketCard}
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
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
    gap: 20,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  ticketTop: {
    padding: 20,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusBadgeTextInactive: {
    color: '#B91C1C',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.8,
  },
  seatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  seatBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  ticketEventTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  metaIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  metaPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaSecondary: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ticketIdText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  tearLineContainer: {
    position: 'relative',
    height: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  cutoutCircle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    top: 0,
  },
  cutoutLeft: {
    left: -12,
  },
  cutoutRight: {
    right: -12,
  },
  dashedDivider: {
    height: 1,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  ticketBottom: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qrImage: {
    width: 170,
    height: 170,
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6C636',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  scanBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  sharePassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    width: '100%',
  },
  sharePassButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 19,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#F6C636',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#F6C636',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
});
