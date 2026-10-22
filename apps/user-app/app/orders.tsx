import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE } from '../constants/api';
import { fetchWithAuth } from '../services/auth';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0
  );
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const loadOrders = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) {
        setUser(null);
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      let fetchedOrders: any[] = [];
      const orderMap = new Map<string, any>();

      // 1. Try Backend API with token
      try {
        const res = await fetchWithAuth(`${API_BASE}/me/orders`);
        if (res.ok) {
          const data = await res.json();
          const list = data.data || data.orders || (Array.isArray(data) ? data : []);
          if (Array.isArray(list)) {
            list.forEach((ord: any) => {
              if (ord && ord.id) orderMap.set(String(ord.id), ord);
            });
          }
        }
      } catch (err) {
        console.warn('Backend orders fetch failed, falling back:', err);
      }

      // 2. Direct Supabase Fallback if backend returns 0 orders
      if (orderMap.size === 0) {
        try {
          const SUPABASE_URL = 'https://kfcocpzuzxpinqgnzhsq.supabase.co';
          const ANON_KEY =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmY29jcHp1enhwaW5xZ256aHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODk2NjgsImV4cCI6MjEwNjc2NTY2OH0.tDVNBk_Pi88UHQoWFQZMgjADTZf6PhGYFWAuynzJfMk';

          const resolvedUserId = parsedUser?.id;
          if (resolvedUserId) {
            const sbRes = await fetch(
              `${SUPABASE_URL}/rest/v1/orders?select=*,events(id,title,starts_at,venues(name,city)),order_items(*,ticket_types(name))&user_id=eq.${resolvedUserId}&order=created_at.desc`,
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
                sbData.forEach((ord: any) => {
                  if (ord && ord.id) orderMap.set(String(ord.id), ord);
                });
              }
            }
          }
        } catch (e) {
          console.warn('Supabase orders fallback failed:', e);
        }
      }

      fetchedOrders = Array.from(orderMap.values());
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const isExpanded = !!expandedOrders[item.id];
    const event = item.event || item.events || {};
    const venue = event.venue || event.venues || {};
    const rawDate = event.startsAt || event.starts_at;
    const eventDate = rawDate ? new Date(rawDate) : null;
    const orderCreatedAt = item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at) : null;

    const formattedOrderDate = orderCreatedAt
      ? orderCreatedAt.toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : 'Date TBA';

    const formattedEventDate = eventDate
      ? eventDate.toLocaleDateString('en-AU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Date TBA';

    const totalAud = ((item.totalCents || 0) / 100).toFixed(2);
    const ticketTotalAud = ((item.ticketTotalCents || item.totalCents || 0) / 100).toFixed(2);
    const buyerFeeAud = ((item.buyerFeeCents || 0) / 100).toFixed(2);
    const orderNum = item.orderNumber || item.order_number || item.id?.slice(0, 8).toUpperCase() || 'ORD-MYTIX';
    const status = item.status || 'PAID';

    const itemsList = item.items || item.order_items || [];

    return (
      <View style={styles.orderCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.orderNumberRow}>
              <Text style={styles.orderNumber}>#{orderNum}</Text>
              <View
                style={[
                  styles.statusBadge,
                  status === 'CANCELLED' ? styles.statusCancelled : styles.statusPaid,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    status === 'CANCELLED' ? styles.statusCancelledText : styles.statusPaidText,
                  ]}
                >
                  {status}
                </Text>
              </View>
            </View>
            <Text style={styles.orderDate}>{formattedOrderDate}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.orderTotalAmount}>${totalAud} AUD</Text>
            <Text style={styles.gstTag}>GST Inclusive</Text>
          </View>
        </View>

        {/* Event Preview Info */}
        <View style={styles.eventInfoBox}>
          <View style={styles.eventIconBox}>
            <Ionicons name="ticket" size={18} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {event.title || 'Live Event Booking'}
            </Text>
            <Text style={styles.eventMeta}>
              {formattedEventDate} • {venue.name || 'Venue TBA'}
            </Text>
          </View>
        </View>

        {/* Expandable Tax Invoice Breakdown */}
        {isExpanded && (
          <View style={styles.invoiceBreakdown}>
            <View style={styles.invoiceDivider} />
            <Text style={styles.invoiceHeading}>TAX INVOICE / RECEIPT SUMMARY</Text>

            {itemsList.length > 0 && (
              <View style={styles.invoiceItemsList}>
                {itemsList.map((orderItem: any, idx: number) => {
                  const tName =
                    orderItem.ticketType?.name ||
                    orderItem.ticket_types?.name ||
                    'General Admission';
                  const qty = orderItem.quantity || 1;
                  const unitPrice = ((orderItem.unitPriceCents || 0) / 100).toFixed(2);
                  const seats = orderItem.selectedSeats || orderItem.selected_seats;
                  const seatStr = Array.isArray(seats)
                    ? seats.map((s: string) => (s.includes(':') ? s.split(':')[1] : s)).join(', ')
                    : null;

                  return (
                    <View key={idx} style={styles.invoiceItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.invoiceItemName}>
                          {tName} × {qty}
                        </Text>
                        {seatStr ? (
                          <Text style={styles.invoiceItemSeats}>Seats: {seatStr}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.invoiceItemPrice}>
                        ${(parseFloat(unitPrice) * qty).toFixed(2)} AUD
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.invoiceSubtotalRow}>
              <Text style={styles.invoiceSubtotalLabel}>Ticket Face Value</Text>
              <Text style={styles.invoiceSubtotalValue}>${ticketTotalAud} AUD</Text>
            </View>

            {parseFloat(buyerFeeAud) > 0 && (
              <View style={styles.invoiceSubtotalRow}>
                <Text style={styles.invoiceSubtotalLabel}>Booking Surcharge & GST (10%)</Text>
                <Text style={styles.invoiceSubtotalValue}>${buyerFeeAud} AUD</Text>
              </View>
            )}

            <View style={[styles.invoiceSubtotalRow, styles.invoiceTotalRow]}>
              <Text style={styles.invoiceTotalLabel}>Total Paid (AUD)</Text>
              <Text style={styles.invoiceTotalValue}>${totalAud} AUD</Text>
            </View>

            <View style={styles.merchantNoteBox}>
              <Ionicons name="shield-checkmark" size={14} color="#D97706" />
              <Text style={styles.merchantNoteText}>
                Mytix Australia • Official Merchant of Record • Tax Invoice Issued
              </Text>
            </View>
          </View>
        )}

        {/* Card Footer Actions */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.expandInvoiceBtn}
            onPress={() => toggleExpand(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'receipt-outline'}
              size={14}
              color="#D97706"
            />
            <Text style={styles.expandInvoiceBtnText}>
              {isExpanded ? 'Hide Invoice' : 'View Tax Invoice'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewTicketsBtn}
            onPress={() => router.push('/(tabs)/live')}
            activeOpacity={0.8}
          >
            <Text style={styles.viewTicketsBtnText}>View QR Passes</Text>
            <Ionicons name="arrow-forward" size={13} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header (Clean White with Safe Area Spacing) */}
      <View style={[styles.header, { paddingTop: topInset + (Platform.OS === 'android' ? 6 : 4) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Order History & Invoices</Text>
          <Text style={styles.headerSubtitle}>Past bookings, payment receipts & GST records</Text>
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      ) : !user ? (
        <View style={styles.centerContainer}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="receipt-outline" size={44} color="#D97706" />
          </View>
          <Text style={styles.emptyTitle}>Sign in to view orders</Text>
          <Text style={styles.emptySubtitle}>
            Login or register to access your past bookings and tax receipts.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/auth')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginBtnText}>Login / Register</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="bag-handle-outline" size={44} color="#D97706" />
          </View>
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptySubtitle}>
            You haven't made any event bookings yet. Explore upcoming concerts and live events!
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(tabs)/movies')}
            activeOpacity={0.8}
          >
            <Text style={styles.browseBtnText}>Explore Live Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D97706"
              colors={['#D97706']}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusPaid: {
    backgroundColor: '#DCFCE7',
  },
  statusPaidText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.3,
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusCancelledText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
  },
  orderDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  orderTotalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  gstTag: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  eventInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  eventIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  eventMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  expandInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  expandInvoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  viewTicketsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F6C636',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  viewTicketsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  invoiceBreakdown: {
    marginTop: 12,
    paddingTop: 12,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    marginBottom: 10,
  },
  invoiceHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  invoiceItemsList: {
    gap: 6,
    marginBottom: 10,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  invoiceItemSeats: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  invoiceItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  invoiceSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  invoiceSubtotalLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  invoiceSubtotalValue: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
  },
  invoiceTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 6,
    paddingTop: 8,
  },
  invoiceTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  invoiceTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  merchantNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  merchantNoteText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 12,
  },
  guestIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: '#F6C636',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  browseBtn: {
    backgroundColor: '#F6C636',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  browseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
