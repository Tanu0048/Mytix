import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, usePreventRemove } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE } from '../constants/api';
import { fetchWithAuth } from '../services/auth';
import { formatSeatLabel } from '../components/SeatPicker';

/** Below this many seconds the countdown turns red to warn the user. */
const LOW_TIME_SECONDS = 120;

type Phase = 'loading' | 'active' | 'paying' | 'done' | 'expired';

function formatAud(cents: number | null | undefined): string {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return { message: res.ok ? '' : `Server error (${res.status}). Please try again in a moment.` };
  }
}

/**
 * Checkout for a server-side seat/ticket hold.
 *
 * The countdown is derived from the hold's absolute `expiresAt` from the server, so it stays
 * correct when the app is backgrounded or the phone is locked. Leaving the screen asks before
 * releasing the hold, so seats go back on sale immediately instead of after the timeout.
 */
export default function CheckoutScreen() {
  const { holdId, existing } = useLocalSearchParams<{ holdId: string; existing?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0);

  const [hold, setHold] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [secondsLeft, setSecondsLeft] = useState(0);
  // One key per checkout attempt: a double tap or network retry can never create a second payment.
  const idempotencyKeyRef = useRef(`mobile-${holdId}-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const releaseHold = useCallback(() => {
    if (!holdId) return;
    fetchWithAuth(`${API_BASE}/holds/${holdId}`, { method: 'DELETE' }).catch(() => {});
  }, [holdId]);

  // Ask before leaving while the reservation is live (back button, swipe-back and header back).
  const disablePrevention = usePreventRemove(phase === 'active' || phase === 'paying', ({ repeat }) => {
    if (phase === 'paying') {
      Alert.alert('Payment in progress', 'Please wait until your payment has finished.');
      return;
    }
    Alert.alert('Leave checkout?', 'Your reserved tickets will be released for other people to book.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Release & Leave',
        style: 'destructive',
        onPress: () => {
          releaseHold();
          repeat();
        },
      },
    ]);
  });

  const leave = useCallback(
    (target?: '/(tabs)/live') => {
      disablePrevention();
      if (target) router.replace(target);
      else if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    },
    [disablePrevention, router]
  );

  // Load the hold from the server (source of truth for items, price and expiry).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/holds/${holdId}`);
        const body = await readJson(res);
        if (cancelled) return;
        if (!res.ok || !body.data) {
          throw new Error(body.error?.message || body.message || 'Reservation not found.');
        }
        if (body.data.status && body.data.status !== 'ACTIVE') {
          setPhase('expired');
          Alert.alert('Reservation Expired', 'Your reservation is no longer active. Please select your tickets again.', [
            { text: 'OK', onPress: () => leave() },
          ]);
          return;
        }
        setHold(body.data);
        setPhase('active');
      } catch (e: any) {
        if (cancelled) return;
        setPhase('expired');
        Alert.alert('Checkout Unavailable', e.message || 'Could not load your reservation.', [
          { text: 'OK', onPress: () => leave() },
        ]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // leave is stable enough for a one-off load; re-running on its identity would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdId]);

  // Countdown from the server's absolute expiry time.
  useEffect(() => {
    if (!hold?.expiresAt || phase !== 'active') return;
    const expiresAt = new Date(hold.expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setPhase('expired');
        Alert.alert('Time’s Up', 'Your reservation has expired and the tickets were released. Please select them again.', [
          { text: 'OK', onPress: () => leave() },
        ]);
      }
    };
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, [hold?.expiresAt, phase, leave]);

  const handlePay = async () => {
    if (phase !== 'active') return;
    setPhase('paying');
    try {
      const res = await fetchWithAuth(`${API_BASE}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKeyRef.current },
        body: JSON.stringify({ holdId }),
      });
      const body = await readJson(res);
      if (!res.ok) {
        throw new Error(body.error?.message || body.message || 'Payment could not be started.');
      }

      // Tickets only exist once the payment has actually succeeded.
      if (body.data?.payment?.status === 'succeeded') {
        setPhase('done');
        Alert.alert('Booking Confirmed! 🎉', 'Your tickets are in My Tickets.', [
          { text: 'View My Tickets', onPress: () => leave('/(tabs)/live') },
        ]);
      } else {
        // TODO(stripe): confirm the PaymentIntent with body.data.payment.clientSecret here.
        setPhase('active');
        Alert.alert(
          'Payment Not Completed',
          'Your tickets are still reserved, but the payment was not completed, so no tickets were issued yet.'
        );
      }
    } catch (e: any) {
      setPhase('active');
      Alert.alert('Payment Error', e.message || 'Something went wrong. Please try again.');
    }
  };

  const pricing = hold?.pricing || { ticketTotalCents: hold?.totalCents, buyerFeeCents: 0, totalCents: hold?.totalCents };
  const seats: string[] = Array.isArray(hold?.selectedSeats) ? hold.selectedSeats : [];
  const seatLabels = seats.map((s) => formatSeatLabel(s));
  const startsAt = hold?.eventStartsAt ? new Date(hold.eventStartsAt) : null;
  const isLowTime = secondsLeft <= LOW_TIME_SECONDS;
  const canPay = phase === 'active' && secondsLeft > 0;

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: topInset + (Platform.OS === 'android' ? 6 : 4) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSubtitle}>Review your tickets and pay</Text>
        </View>
      </View>

      {phase === 'loading' || !hold ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={styles.loadingText}>Loading your reservation…</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Live reservation countdown */}
            <View
              style={[styles.timerCard, isLowTime && styles.timerCardLow]}
              accessibilityRole="timer"
              accessibilityLabel={`Tickets reserved for ${Math.floor(secondsLeft / 60)} minutes ${secondsLeft % 60} seconds`}
            >
              <Ionicons name="time-outline" size={20} color={isLowTime ? '#B91C1C' : '#B45309'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.timerLabel, isLowTime && styles.timerLabelLow]}>
                  {existing === '1' ? 'Your earlier reservation is still held' : 'Tickets reserved for you'}
                </Text>
                <Text style={styles.timerHint}>Complete payment before the timer runs out.</Text>
              </View>
              <Text style={[styles.timerValue, isLowTime && styles.timerValueLow]}>{formatCountdown(secondsLeft)}</Text>
            </View>

            {/* Event + items */}
            <View style={styles.card}>
              <Text style={styles.eventTitle}>{hold.eventTitle}</Text>
              {startsAt ? (
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text style={styles.metaText}>
                    {startsAt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {startsAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </Text>
                </View>
              ) : null}

              <View style={styles.divider} />

              {/* One line per ticket category (a booking can mix e.g. VIP + Standard) */}
              {(Array.isArray(hold.items) && hold.items.length > 1
                ? hold.items
                : [{ ticketTypeId: hold.ticketTypeId, ticketTypeName: hold.ticketTypeName, quantity: hold.quantity, totalCents: pricing.ticketTotalCents }]
              ).map((item: any) => (
                <View key={item.ticketTypeId || 'single'} style={styles.lineRow}>
                  <Text style={styles.lineLabel}>
                    {item.quantity} × {item.ticketTypeName || 'General Admission'}
                  </Text>
                  <Text style={styles.lineValue}>{formatAud(item.totalCents)}</Text>
                </View>
              ))}
              {seatLabels.length > 0 ? (
                <View style={styles.seatChips}>
                  {seatLabels.map((label) => (
                    <View key={label} style={styles.seatChip}>
                      <Text style={styles.seatChipText}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Price breakdown */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Price details</Text>
              <View style={styles.lineRow}>
                <Text style={styles.lineLabel}>Tickets</Text>
                <Text style={styles.lineValue}>{formatAud(pricing.ticketTotalCents)}</Text>
              </View>
              <View style={styles.lineRow}>
                <Text style={styles.lineLabel}>Booking fee</Text>
                <Text style={styles.lineValue}>{formatAud(pricing.buyerFeeCents)}</Text>
              </View>
              <View style={[styles.divider, styles.dashed]} />
              <View style={styles.lineRow}>
                <Text style={styles.totalLabel}>Total (AUD)</Text>
                <Text style={styles.totalValue}>{formatAud(pricing.totalCents)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky pay bar */}
          <View style={[styles.payBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <TouchableOpacity
              style={[styles.payButton, !canPay && styles.payButtonDisabled]}
              onPress={handlePay}
              disabled={!canPay}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {phase === 'paying' ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={16} color="#0F172A" />
                  <Text style={styles.payButtonText}>Pay {formatAud(pricing.totalCents)}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  timerCardLow: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  timerLabel: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  timerLabelLow: { color: '#991B1B' },
  timerHint: { fontSize: 11, color: '#78716C', marginTop: 2 },
  timerValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#B45309',
    fontVariant: ['tabular-nums'],
  },
  timerValueLow: { color: '#B91C1C' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  eventTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  dashed: { backgroundColor: 'transparent', borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#E2E8F0', height: 0 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  lineLabel: { fontSize: 13, color: '#475569', fontWeight: '600', flexShrink: 1, paddingRight: 12 },
  lineValue: { fontSize: 13, color: '#0F172A', fontWeight: '700', fontVariant: ['tabular-nums'] },
  totalLabel: { fontSize: 15, color: '#0F172A', fontWeight: '800' },
  totalValue: { fontSize: 18, color: '#0F172A', fontWeight: '900', fontVariant: ['tabular-nums'] },
  seatChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  seatChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  seatChipText: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  payBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  payButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F6C636',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
});
