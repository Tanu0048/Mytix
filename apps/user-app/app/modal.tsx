import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function GuaranteeModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#D97706" />
          </View>
          <Text style={styles.headerTitle}>Mytix Guarantee</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTagline}>AUSTRALIAN VERIFIED TICKETING</Text>
          <Text style={styles.heroHeading}>100% Authenticity Guaranteed</Text>
          <Text style={styles.heroBody}>
            Mytix works directly with verified Australian event organisers and venues. Every ticket is cryptographically signed, fraud-proof, and guaranteed to grant entry.
          </Text>
        </View>

        {/* Feature List */}
        <View style={styles.featureList}>
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="qr-code" size={22} color="#D97706" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Fraud-Proof Digital Passes</Text>
              <Text style={styles.featureDesc}>
                Dynamic anti-screenshot security codes ensure your entry pass can never be duplicated or sold second-hand unlawfully.
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="card" size={22} color="#D97706" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>All Prices in AUD (GST Inclusive)</Text>
              <Text style={styles.featureDesc}>
                No hidden conversion surcharges or surprise fees. All checkout totals are strictly in Australian Dollars.
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="call" size={22} color="#D97706" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Dedicated Australian Support</Text>
              <Text style={styles.featureDesc}>
                Need assistance with your booking or venue accessibility? Our Australian team is ready to help 7 days a week.
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Us Action Row */}
        <View style={styles.contactSection}>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL('tel:0455600003')}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={16} color="#0F172A" />
            <Text style={styles.contactBtnText}>Call 0455 600 003</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactBtn, styles.contactBtnSecondary]}
            onPress={() => Linking.openURL('mailto:support@mytix.com.au')}
            activeOpacity={0.8}
          >
            <Ionicons name="mail" size={16} color="#0F172A" />
            <Text style={styles.contactBtnText}>Email Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shieldBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 20,
  },
  heroTagline: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  heroHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  heroBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '500',
  },
  featureList: {
    gap: 14,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  contactSection: {
    flexDirection: 'row',
    gap: 12,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6C636',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  contactBtnSecondary: {
    backgroundColor: '#F1F5F9',
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
