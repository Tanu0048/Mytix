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

      if (!storedUser || !storedToken) {
        setUser(null);
        setToken(null);
        setTickets([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setUser(JSON.parse(storedUser));
      setToken(storedToken);

      // Fetch tickets
      const res = await fetch(`${API_BASE}/me/tickets`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data.data || data.tickets || []);
      } else {
        setTickets([]);
      }
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
    const event = item.order?.event || item.event || {};
    const venue = event.venue || {};
    const eventDate = event.startsAt ? new Date(event.startsAt) : null;
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

    const qrData = item.qrTokenHash || item.id || 'MYTIX-PASS';
    const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=4&data=${encodeURIComponent(
      qrData
    )}`;

    const shortId = (item.id || 'PASS').slice(0, 8).toUpperCase();

    return (
      <View style={styles.ticketCard}>
        {/* Top Section */}
        <View style={styles.ticketTop}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{item.status || 'CONFIRMED'}</Text>
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
              <Text style={styles.metaPrimary}>{item.attendeeName || user?.name || 'Attendee'}</Text>
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
          <Text style={styles.emptyTitle}>No tickets yet</Text>
          <Text style={styles.emptySubtitle}>
            Looks like you haven't booked any events yet. Explore what's happening and grab your tickets!
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/movies')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Explore Events</Text>
          </TouchableOpacity>
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
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.8,
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
