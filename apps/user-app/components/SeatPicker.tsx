import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export interface SeatingSection {
  id?: string;
  name: string;
  tierName?: string;
  rows: string[];
  seatsPerRow: number;
}

export interface SeatingConfig {
  sections: SeatingSection[];
}

interface SeatPickerProps {
  config: SeatingConfig;
  ticketTypes: Array<{
    id: string;
    name: string;
    priceCents: number;
    available: number;
  }>;
  selectedSeats: string[]; // e.g. ["Front Section:A-1", "A-2"]
  onToggleSeat: (seatKey: string, tierId: string) => void;
  bookedSeats?: string[];
  heldSeats?: string[];
  maxSeats?: number;
  disabled?: boolean;
}

const TIER_BORDER_COLORS = [
  '#F59E0B', // Amber / VIP
  '#06B6D4', // Cyan / Premium
  '#A855F7', // Purple / Standard
  '#10B981', // Green / Economy
];

export default function SeatPicker({
  config,
  ticketTypes,
  selectedSeats,
  onToggleSeat,
  bookedSeats = [],
  heldSeats = [],
  maxSeats = 10,
  disabled = false,
}: SeatPickerProps) {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer

  useEffect(() => {
    if (selectedSeats.length === 0) {
      setTimeLeft(300);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedSeats.length]);

  if (!config || !config.sections || config.sections.length === 0) {
    return null;
  }

  const getTierInfoForSection = (section: SeatingSection) => {
    let index = 0;
    if (section.tierName) {
      const matchIndex = ticketTypes.findIndex(
        (t) => t.name.toLowerCase() === section.tierName?.toLowerCase()
      );
      if (matchIndex !== -1) index = matchIndex;
    }
    const tier = ticketTypes[index] || ticketTypes[0];
    const borderColor = TIER_BORDER_COLORS[index % TIER_BORDER_COLORS.length];
    return { tier, borderColor };
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      {/* Stage / Screen Bar */}
      <View style={styles.stageWrapper}>
        <LinearGradient
          colors={['transparent', '#F59E0B', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.stageGlowBar}
        />
        <Text style={styles.stageLabel}>STAGE / SCREEN</Text>
      </View>

      {/* Dynamic Tier Legend */}
      <View style={styles.legendContainer}>
        {ticketTypes.map((tier, idx) => {
          const borderColor = TIER_BORDER_COLORS[idx % TIER_BORDER_COLORS.length];
          const price = (tier.priceCents / 100).toFixed(0);
          return (
            <View key={tier.id || idx} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { borderColor }]} />
              <View>
                <Text style={styles.legendTextPrimary}>{tier.name}</Text>
                <Text style={styles.legendTextSecondary}>${price} AUD</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendSelectedSwatch]}>
            <Ionicons name="checkmark" size={10} color="#0F172A" />
          </View>
          <Text style={styles.legendTextPrimary}>Selected</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendBookedSwatch]}>
            <Ionicons name="close" size={10} color="#64748B" />
          </View>
          <Text style={styles.legendTextSecondary}>Booked</Text>
        </View>
      </View>

      {/* Horizontal Scrollable Seating Chart */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollChartContainer}
      >
        <View style={{ alignItems: 'center' }}>
          {config.sections.map((section, sIdx) => {
            const { tier, borderColor } = getTierInfoForSection(section);
            const price = tier ? `$${(tier.priceCents / 100).toFixed(0)} AUD` : '';

            return (
              <View key={section.id || sIdx} style={styles.sectionBlock}>
                {/* Section Header Pill */}
                <View style={styles.sectionPill}>
                  <Text style={styles.sectionPillTitle}>{section.name}</Text>
                  {tier ? (
                    <>
                      <Text style={styles.sectionPillDot}>•</Text>
                      <Text style={styles.sectionPillPrice}>{price}</Text>
                    </>
                  ) : null}
                </View>

                {/* Rows Grid */}
                <View style={styles.rowsContainer}>
                  {section.rows.map((rowName) => (
                    <View key={rowName} style={styles.rowWrapper}>
                      {/* Left Row Label */}
                      <Text style={styles.rowLabel}>{rowName}</Text>

                      {/* Seats in this row */}
                      <View style={styles.seatsRow}>
                        {Array.from({ length: section.seatsPerRow }, (_, i) => {
                          const seatNum = i + 1;
                          const seatKey = `${section.name}:${rowName}-${seatNum}`;
                          const simpleKey = `${rowName}-${seatNum}`;

                          const isSelected =
                            selectedSeats.includes(seatKey) ||
                            selectedSeats.includes(simpleKey);

                          const isBooked = bookedSeats.some(
                            (s) =>
                              s === seatKey ||
                              s === simpleKey ||
                              s === `${rowName}-${seatNum}` ||
                              s.endsWith(`:${rowName}-${seatNum}`) ||
                              s.endsWith(`-${rowName}-${seatNum}`)
                          );

                          const isHeld = heldSeats.some(
                            (s) =>
                              s === seatKey ||
                              s === simpleKey ||
                              s === `${rowName}-${seatNum}` ||
                              s.endsWith(`:${rowName}-${seatNum}`) ||
                              s.endsWith(`-${rowName}-${seatNum}`)
                          );

                          const isUnavailable = isBooked || isHeld;
                          const seatLabel = `${rowName}${seatNum}`;

                          // Theater Parabolic curve
                          const centerIndex = (section.seatsPerRow - 1) / 2;
                          const distanceFromCenter = Math.abs(i - centerIndex);
                          const curveOffset = Math.round(
                            distanceFromCenter * distanceFromCenter * 0.7
                          );

                          return (
                            <TouchableOpacity
                              key={seatNum}
                              activeOpacity={0.7}
                              disabled={isUnavailable || disabled}
                              onPress={() => {
                                if (isUnavailable || disabled) return;
                                if (tier) onToggleSeat(seatKey, tier.id);
                              }}
                              style={[
                                styles.seatButton,
                                {
                                  marginTop: curveOffset,
                                  borderColor: isSelected
                                    ? '#F6C636'
                                    : isUnavailable
                                    ? '#1E293B'
                                    : borderColor,
                                  backgroundColor: isSelected
                                    ? '#F6C636'
                                    : isUnavailable
                                    ? '#161F30'
                                    : '#0F172A',
                                  opacity: isUnavailable ? 0.35 : 1,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.seatText,
                                  {
                                    color: isSelected
                                      ? '#0F172A'
                                      : isUnavailable
                                      ? '#475569'
                                      : '#F1F5F9',
                                    fontWeight: isSelected ? '900' : '700',
                                  },
                                ]}
                              >
                                {seatLabel}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Right Row Label */}
                      <Text style={styles.rowLabel}>{rowName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Selected Seats Bottom Strip */}
      {selectedSeats.length > 0 && (
        <View style={styles.selectedStrip}>
          <View style={styles.selectedHeaderRow}>
            <Text style={styles.selectedCountText}>
              Selected Seats ({selectedSeats.length}):
            </Text>
            <View style={styles.timerBadge}>
              <Ionicons name="time-outline" size={13} color="#F59E0B" />
              <Text style={styles.timerText}>{formatTimer(timeLeft)}</Text>
            </View>
          </View>

          <View style={styles.chipsContainer}>
            {selectedSeats.map((key) => {
              const label = key.includes(':') ? key.split(':')[1] : key;
              return (
                <View key={key} style={styles.seatChip}>
                  <Text style={styles.seatChipText}>{label}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.maxNotice}>Max {maxSeats} seats allowed per booking</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A', // Dark theater mode
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  stageWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stageGlowBar: {
    width: '70%',
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  stageLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendSelectedSwatch: {
    backgroundColor: '#F6C636',
    borderColor: '#F6C636',
  },
  legendBookedSwatch: {
    backgroundColor: '#1E293B',
    borderColor: '#475569',
  },
  legendTextPrimary: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  legendTextSecondary: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  scrollChartContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sectionBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
    gap: 6,
  },
  sectionPillTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sectionPillDot: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionPillPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
  },
  rowsContainer: {
    gap: 8,
    alignItems: 'center',
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    width: 20,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
  },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  seatText: {
    fontSize: 9,
    letterSpacing: -0.5,
  },
  selectedStrip: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 4,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  seatChip: {
    backgroundColor: 'rgba(246, 198, 54, 0.15)',
    borderColor: 'rgba(246, 198, 54, 0.5)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seatChipText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F6C636',
  },
  maxNotice: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
});
