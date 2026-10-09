import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Dimensions, useColorScheme } from 'react-native';
import { SkeletonBone } from '../components/Skeleton';
import { Stack } from 'expo-router';

const { width } = Dimensions.get('window');

export default function SkeletonDemoScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? '#0F172A' : '#F8FAFC'; // Tailwind slate-900 / slate-50
  const cardColor = isDark ? '#1E293B' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen options={{ title: 'Loading...', headerStyle: { backgroundColor: bgColor }, headerTintColor: isDark ? '#fff' : '#000' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <SkeletonBone width={48} height={48} borderRadius={24} />
          <View style={styles.headerTextCol}>
            <SkeletonBone width={100} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
            <SkeletonBone width={160} height={18} borderRadius={4} />
          </View>
          <SkeletonBone width={40} height={40} borderRadius={20} />
        </View>

        {/* Horizontal Date Picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePickerContainer}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.datePill, { backgroundColor: cardColor, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <SkeletonBone width={24} height={10} borderRadius={4} style={{ marginBottom: 8 }} />
              <SkeletonBone width={36} height={36} borderRadius={18} />
            </View>
          ))}
        </ScrollView>

        {/* Time Slot Chips */}
        <View style={styles.section}>
          <SkeletonBone width={120} height={20} borderRadius={6} style={{ marginBottom: 16 }} />
          <View style={styles.timeGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={[styles.timeChip, { backgroundColor: cardColor, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <SkeletonBone width={60} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>

        {/* Service / Listing Cards */}
        <View style={styles.section}>
          <SkeletonBone width={180} height={20} borderRadius={6} style={{ marginBottom: 16 }} />
          {[1, 2].map((i) => (
            <View key={i} style={[styles.listingCard, { backgroundColor: cardColor, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              {/* Left: Thumbnail */}
              <SkeletonBone width={100} height={100} borderRadius={16} />
              
              {/* Right: Details */}
              <View style={styles.cardRight}>
                <SkeletonBone width={60} height={20} borderRadius={10} style={{ marginBottom: 8 }} />
                <SkeletonBone width={width - 180} height={18} borderRadius={4} style={{ marginBottom: 6 }} />
                
                <View style={styles.row}>
                  <SkeletonBone width={16} height={16} borderRadius={8} style={{ marginRight: 6 }} />
                  <SkeletonBone width={100} height={14} borderRadius={4} />
                </View>

                {/* Card Bottom: Price and CTA */}
                <View style={styles.cardBottom}>
                  <SkeletonBone width={60} height={20} borderRadius={4} />
                  <SkeletonBone width={80} height={32} borderRadius={16} />
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTextCol: {
    flex: 1,
    paddingHorizontal: 16,
  },
  datePickerContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  datePill: {
    width: 60,
    height: 80,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  section: {
    marginBottom: 30,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeChip: {
    width: (width - 40 - 24) / 3, // 3 columns
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRight: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
