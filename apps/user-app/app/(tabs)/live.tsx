import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE } from '../../constants/api';
import { fetchWithAuth } from '../../services/auth';

export default function MyTicketsScreen() {
  const router = useRouter();
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

      // 2. Direct Supabase REST fallback if backend returned 0 tickets or no token
      if (ticketMap.size === 0) {
        try {
          const SUPABASE_URL = 'https://kfcocpzuzxpinqgnzhsq.supabase.co';
          const ANON_KEY =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmY29jcHp1enhwaW5xZ256aHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODk2NjgsImV4cCI6MjEwNjc2NTY2OH0.tDVNBk_Pi88UHQoWFQZMgjADTZf6PhGYFWAuynzJfMk';

          let resolvedUserId = parsedUser?.id;
          const userEmail = (parsedUser?.email || '').toLowerCase().trim();

          // Resolve userId from email if missing in stored user object
          if (!resolvedUserId && userEmail) {
            try {
              const uRes = await fetch(
                `${SUPABASE_URL}/rest/v1/users?select=id&email=eq.${encodeURIComponent(userEmail)}`,
                {
                  headers: {
                    apikey: ANON_KEY,
                    Authorization: `Bearer ${ANON_KEY}`,
                  },
                }
              );
              if (uRes.ok) {
                const uData = await uRes.json();
                if (Array.isArray(uData) && uData.length > 0 && uData[0].id) {
                  resolvedUserId = uData[0].id;
                  parsedUser.id = resolvedUserId;
                  await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
                  setUser(parsedUser);
                }
              }
            } catch (err) {
              console.warn('Supabase user resolution failed:', err);
            }
          }

          // A) Fetch tickets by orders.user_id
          if (resolvedUserId) {
            try {
              const sbRes = await fetch(
                `${SUPABASE_URL}/rest/v1/tickets?select=*,orders!inner(id,user_id,events(id,title,starts_at,venues(name,city)))&orders.user_id=eq.${resolvedUserId}&order=created_at.desc`,
                {
                  headers: {
                    apikey: ANON_KEY,
                    Authorization: `Bearer ${ANON_KEY}`,
                  },
                }
              );
              if (sbRes.ok) {
                const sbData = await sbRes.json();
                if (Array.isArray(sbData)) {
                  sbData.forEach((t: any) => {
                    if (t && t.id) ticketMap.set(String(t.id), t);
                  });
                }
              }
            } catch (err) {
              console.warn('Supabase query by user_id failed:', err);
            }
          }

          // B) Fetch tickets by attendee_email (e.g. if tickets assigned or purchased under this email)
          if (userEmail) {
            try {
              const attRes = await fetch(
                `${SUPABASE_URL}/rest/v1/tickets?select=*,orders(id,user_id,events(id,title,starts_at,venues(name,city)))&attendee_email=eq.${encodeURIComponent(userEmail)}&order=created_at.desc`,
                {
                  headers: {
                    apikey: ANON_KEY,
                    Authorization: `Bearer ${ANON_KEY}`,
                  },
                }
              );
              if (attRes.ok) {
                const attData = await attRes.json();
                if (Array.isArray(attData)) {
                  attData.forEach((t: any) => {
                    if (t && t.id) ticketMap.set(String(t.id), t);
                  });
                }
              }
            } catch (err) {
              console.warn('Supabase query by attendee_email failed:', err);
            }
          }
        } catch (e) {
          console.warn('Supabase direct tickets query failed:', e);
        }
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
    const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=4&data=${encodeURIComponent(
      qrData
    )}`;

    const shortId = (item.id || 'PASS').slice(0, 8).toUpperCase();

    const rawRow = item.seatRow || item.seat_row;
    const rawNum = item.seatNumber || item.seat_number;
    const cleanRow = rawRow ? (rawRow.includes(':') ? rawRow.split(':')[1] : rawRow) : null;
    const seatLabel = cleanRow && rawNum ? `${cleanRow}${rawNum}` : null;

    return (
      <View style={styles.ticketCard}>
        {/* Top Section */}
        <View style={styles.ticketTop}>
          <View style={styles.statusBadgeRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{item.status || 'CONFIRMED'}</Text>
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
            <View style={styles.metaRow}>
              <View style={styles.metaIconCircle}>
                <Ionicons name="location" size={14} color="#D97706" />
              </View>
              <View>
                <Text style={styles.metaPrimary}>{venue.name}</Text>
                <Text style={styles.metaSecondary}>{venue.city || 'Australia'}</Text>
              </View>
            </View>
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
            <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
          </View>
          <View style={styles.scanBadge}>
            <Ionicons name="scan-outline" size={14} color="#0F172A" />
            <Text style={styles.scanBadgeText}>Scan this code at the gate</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header (Clean White) */}
      <View style={styles.header}>
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
    </SafeAreaView>
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
    paddingTop: Platform.OS === 'android' ? 14 : 8,
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
