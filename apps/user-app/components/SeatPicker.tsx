import React, { useMemo } from 'react';
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

/** "Club:T3-2" -> "Table 3 · Seat 2", "Stalls:A-4" -> "A4". */
export function formatSeatLabel(key: string): string {
  const plain = key.includes(':') ? key.slice(key.indexOf(':') + 1) : key;
  const dash = plain.lastIndexOf('-');
  if (dash === -1) return plain;
  const row = plain.slice(0, dash);
  const num = plain.slice(dash + 1);
  return /^T[0-9]+$/.test(row) ? `Table ${row.slice(1)} · Seat ${num}` : `${row}${num}`;
}

export interface SeatingSection {
  id?: string;
  name: string;
  tierName?: string;
  /** "ROWS" (default), "TABLES" (rows are tables T1, T2…) or "STANDING" (no seats; sold by quantity). */
  kind?: 'ROWS' | 'TABLES' | 'STANDING';
  rows: string[];
  seatsPerRow: number;
  /** Seats not for sale (aisles, pillars…), e.g. ["A-5"]. Rendered as gaps. */
  blocked?: string[];
  /** Wheelchair spaces, e.g. ["A-1"]. */
  accessible?: string[];
}

export interface SeatingConfig {
  version?: number;
  stageLabel?: string;
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

/**
 * Builds a lookup that answers "is seat <section, row, number> taken?" from the backend seat list.
 *
 * The backend lists a sectioned seat under several keys ("Front:A-1", "Front-A-1" and plain "A-1"),
 * and an unsectioned seat only as "A-1". So a plain "A-1" only blocks every section when no
 * sectioned entry for A-1 exists; otherwise "Front:A-1" being booked would wrongly block "Back:A-1".
 */
function buildSeatLookup(keys: string[]) {
  const set = new Set(keys);
  const sectionedPlainKeys = new Set<string>();
  for (const k of keys) {
    const colon = k.indexOf(':');
    if (colon !== -1) sectionedPlainKeys.add(k.slice(colon + 1));
  }
  return (section: string, row: string, num: number) => {
    const plain = `${row}-${num}`;
    if (set.has(`${section}:${plain}`) || set.has(`${section}-${plain}`)) return true;
    return set.has(plain) && !sectionedPlainKeys.has(plain);
  };
}

const SEAT_SIZE = 32;
const TABLE_BOX = 128;
const TABLE_RADIUS = 46;

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
  // Hooks must run before the early return below.
  const isBookedSeat = useMemo(() => buildSeatLookup(bookedSeats), [bookedSeats]);
  const isHeldSeat = useMemo(() => buildSeatLookup(heldSeats), [heldSeats]);

  const seatSections = (config?.sections || []).filter((s) => (s.kind || 'ROWS') !== 'STANDING');
  if (seatSections.length === 0) {
    return null;
  }
  // Legend: only categories that are actually on the seat map
  const seatedTierNames = new Set(seatSections.map((s) => (s.tierName || '').trim().toLowerCase()));
  const legendTiers =
    config.version === 2
      ? ticketTypes.filter((t) => seatedTierNames.has(t.name.trim().toLowerCase()))
      : ticketTypes;
  const hasAccessible = seatSections.some((s) => (s.accessible || []).length > 0);

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
        <Text style={styles.stageLabel}>{(config.stageLabel || 'Stage / Screen').toUpperCase()}</Text>
      </View>

      {/* Dynamic Tier Legend */}
      <View style={styles.legendContainer}>
        {legendTiers.map((tier) => {
          const idx = Math.max(0, ticketTypes.findIndex((t) => t.id === tier.id));
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

        {hasAccessible && (
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendAccessibleSwatch]}>
              <Text style={{ fontSize: 8 }}>♿</Text>
            </View>
            <Text style={styles.legendTextPrimary}>Wheelchair</Text>
          </View>
        )}
      </View>

      {/* Horizontal Scrollable Seating Chart */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollChartContainer}
      >
        <View style={{ alignItems: 'center' }}>
          {seatSections.map((section, sIdx) => {
            const { tier, borderColor } = getTierInfoForSection(section);
            const price = tier ? `$${(tier.priceCents / 100).toFixed(0)} AUD` : '';
            const blocked = new Set(section.blocked || []);
            const accessible = new Set(section.accessible || []);
            const isTables = section.kind === 'TABLES';

            const renderSeat = (rowName: string, seatNum: number, extraStyle?: object) => {
              const plain = `${rowName}-${seatNum}`;
              const seatKey = `${section.name}:${plain}`;
              const isSelected = selectedSeats.includes(seatKey);
              const isBooked = isBookedSeat(section.name, rowName, seatNum);
              const isHeld = !isBooked && isHeldSeat(section.name, rowName, seatNum);
              const isUnavailable = isBooked || isHeld;
              const isAccessible = accessible.has(plain);
              const seatLabel = isTables ? String(seatNum) : `${rowName}${seatNum}`;

              return (
                <TouchableOpacity
                  key={plain}
                  activeOpacity={0.7}
                  disabled={isUnavailable || disabled}
                  accessibilityLabel={`${section.name} ${formatSeatLabel(plain)}${isAccessible ? ', wheelchair space' : ''}`}
                  onPress={() => {
                    if (isUnavailable || disabled) return;
                    if (tier) onToggleSeat(seatKey, tier.id);
                  }}
                  style={[
                    styles.seatButton,
                    extraStyle,
                    {
                      borderColor: isSelected
                        ? '#F6C636'
                        : isUnavailable
                        ? '#1E293B'
                        : isAccessible
                        ? '#38BDF8'
                        : borderColor,
                      backgroundColor: isSelected
                        ? '#F6C636'
                        : isUnavailable
                        ? '#161F30'
                        : isAccessible
                        ? 'rgba(14, 165, 233, 0.25)'
                        : '#0F172A',
                      opacity: isUnavailable ? 0.35 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.seatText,
                      {
                        color: isSelected ? '#0F172A' : isUnavailable ? '#475569' : '#F1F5F9',
                        fontWeight: isSelected ? '900' : '700',
                      },
                    ]}
                  >
                    {isAccessible && !isSelected ? '♿' : seatLabel}
                  </Text>
                </TouchableOpacity>
              );
            };

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

                {isTables ? (
                  /* Tables: chairs placed around each round table */
                  <View style={styles.tablesWrap}>
                    {section.rows.map((tableName) => {
                      const chairs = section.seatsPerRow;
                      return (
                        <View key={tableName} style={styles.tableBox}>
                          <View style={styles.tableTop}>
                            <Text style={styles.tableLabel}>{tableName.replace(/^T/, 'Table ')}</Text>
                          </View>
                          {Array.from({ length: chairs }, (_, i) => {
                            const seatNum = i + 1;
                            if (blocked.has(`${tableName}-${seatNum}`)) return null;
                            const angle = (2 * Math.PI * i) / chairs - Math.PI / 2;
                            const center = TABLE_BOX / 2 - SEAT_SIZE / 2;
                            return renderSeat(tableName, seatNum, {
                              position: 'absolute',
                              left: center + Math.cos(angle) * TABLE_RADIUS,
                              top: center + Math.sin(angle) * TABLE_RADIUS,
                            });
                          })}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  /* Rows Grid */
                  <View style={styles.rowsContainer}>
                    {section.rows.map((rowName) => (
                      <View key={rowName} style={styles.rowWrapper}>
                        <Text style={styles.rowLabel}>{rowName}</Text>
                        <View style={styles.seatsRow}>
                          {Array.from({ length: section.seatsPerRow }, (_, i) => {
                            const seatNum = i + 1;
                            // Theater parabolic curve
                            const centerIndex = (section.seatsPerRow - 1) / 2;
                            const distanceFromCenter = Math.abs(i - centerIndex);
                            const curveOffset = Math.round(distanceFromCenter * distanceFromCenter * 0.7);
                            if (blocked.has(`${rowName}-${seatNum}`)) {
                              // Blocked seats (aisles, pillars) leave a gap
                              return <View key={seatNum} style={styles.seatGap} />;
                            }
                            return renderSeat(rowName, seatNum, { marginTop: curveOffset });
                          })}
                        </View>
                        <Text style={styles.rowLabel}>{rowName}</Text>
                      </View>
                    ))}
                  </View>
                )}
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
          </View>

          <View style={styles.chipsContainer}>
            {selectedSeats.map((key) => {
              const label = formatSeatLabel(key);
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
  legendAccessibleSwatch: {
    backgroundColor: 'rgba(14, 165, 233, 0.35)',
    borderColor: '#38BDF8',
  },
  seatGap: {
    width: SEAT_SIZE,
    height: SEAT_SIZE,
  },
  tablesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: TABLE_BOX * 3 + 24,
  },
  tableBox: {
    width: TABLE_BOX,
    height: TABLE_BOX,
    position: 'relative',
  },
  tableTop: {
    position: 'absolute',
    left: TABLE_BOX / 2 - 26,
    top: TABLE_BOX / 2 - 26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#E2E8F0',
    textAlign: 'center',
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
    width: SEAT_SIZE,
    height: SEAT_SIZE,
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
