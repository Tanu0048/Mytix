import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE } from '../../constants/api';
import { fetchWithAuth, logoutUser } from '../../services/auth';

const PROFILE_FAQS = [
  {
    q: 'How do I receive and access my tickets?',
    a: "All tickets on Mytix are 100% digital. Once booked, your verified QR entry pass is instantly generated under the 'My Tickets' tab.",
  },
  {
    q: 'How does entry verification work at the gate?',
    a: "Simply show the QR code on your phone in the 'My Tickets' tab to the turnstile gate scanners for instant, fraud-proof admission.",
  },
  {
    q: 'Can I transfer or cancel my tickets?',
    a: 'Yes! Depending on the organizer refund policy, you can request a cancellation or transfer up to 24 hours before the event starts.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'We support major Credit/Debit cards (Visa, Mastercard, Amex), Apple Pay, and Google Pay with bank-grade encryption.',
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        try {
          const storedUser = await AsyncStorage.getItem('user');
          const storedToken = await AsyncStorage.getItem('token');
          if (storedUser && storedToken) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setToken(storedToken);
            setName(parsed.name || '');
            setPhone(parsed.phone || '');
          } else {
            setUser(null);
            setToken(null);
          }
        } catch {
          setUser(null);
          setToken(null);
        }
      };
      loadProfile();
    }, [])
  );

  const handleSaveChanges = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetchWithAuth(`${API_BASE}/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedUser = data.user || { ...user, name: name.trim(), phone: phone.trim() };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Error', errData.error?.message || 'Failed to update profile.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your Mytix account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          setUser(null);
          setToken(null);
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/me`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await logoutUser();
        setUser(null);
        setToken(null);
        setIsDeleteModalOpen(false);
        Alert.alert('Account Deleted', 'Your account and personal data have been removed.');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Network error while attempting account deletion.');
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = (userName: string) => {
    if (!userName) return 'U';
    return userName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header (Clean White) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your profile, tickets and security</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {user ? (
          /* ================= LOGGED IN VIEW ================= */
          <View style={styles.sectionContainer}>
            {/* Top User Card */}
            <View style={styles.profileHeroCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user.name || user.email)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {user.name || 'Mytix User'}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user.email}
                </Text>
                <View style={styles.roleBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#92400E" />
                  <Text style={styles.roleText}>{user.role || 'Member'}</Text>
                </View>
              </View>
            </View>

            {/* Section 1: Personal Info Form */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBox}>
                  <Ionicons name="person" size={16} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Personal Information</Text>
                  <Text style={styles.cardSubtitle}>Keep your contact info up to date</Text>
                </View>
              </View>

              {/* Name Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Email Field (Locked) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputWrapper, styles.inputDisabled]}>
                  <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={[styles.textInput, { color: '#64748B' }]}
                    value={user.email}
                    editable={false}
                  />
                  <Ionicons name="lock-closed" size={14} color="#94A3B8" />
                </View>
                <Text style={styles.inputHelp}>
                  Email is locked because all tickets and invoices are tied to this address.
                </Text>
              </View>

              {/* Phone Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+61 400 000 000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.7 }]}
                onPress={handleSaveChanges}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <>
                    <Ionicons
                      name={saveSuccess ? 'checkmark-circle' : 'save-outline'}
                      size={18}
                      color="#0F172A"
                    />
                    <Text style={styles.saveButtonText}>
                      {saveSuccess ? 'Changes Saved!' : 'Save Changes'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Section 2: My Tickets Quick Card */}
            <TouchableOpacity
              style={styles.ticketsBanner}
              activeOpacity={0.9}
              onPress={() => router.push('/(tabs)/live')}
            >
              <View style={styles.ticketsBannerIcon}>
                <Ionicons name="ticket" size={24} color="#0F172A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketsBannerTitle}>My Tickets & Entry Passes</Text>
                <Text style={styles.ticketsBannerSubtitle}>
                  View booked events, dates, and live QR passes to scan at the gate.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D97706" />
            </TouchableOpacity>

            {/* Section 3: Help Center & FAQs */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="help-circle" size={18} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Help Center & FAQs</Text>
                  <Text style={styles.cardSubtitle}>Australian ticketing assistance & FAQs</Text>
                </View>
              </View>

              {/* Australian Concierge Call Banner */}
              <TouchableOpacity
                style={styles.helpCallBanner}
                activeOpacity={0.8}
                onPress={() =>
                  Linking.openURL('tel:0455600003').catch(() => {
                    Alert.alert('Australian Support', 'Call us at 0455 600 003 for direct concierge assistance.');
                  })
                }
              >
                <View style={styles.helpCallIconBox}>
                  <Ionicons name="headset" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.helpCallTitle}>Australian Phone Support</Text>
                  <Text style={styles.helpCallSubtitle}>Call 0455 600 003 • 7 Days a Week</Text>
                </View>
                <View style={styles.callNowBadge}>
                  <Text style={styles.callNowBadgeText}>Call Now</Text>
                </View>
              </TouchableOpacity>

              {/* FAQs Accordion */}
              <View style={styles.faqList}>
                {PROFILE_FAQS.map((faq, index) => {
                  const isExpanded = expandedFaq === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.faqItem}
                      onPress={() => setExpandedFaq(isExpanded ? null : index)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.faqQuestionRow}>
                        <Text style={styles.faqQuestionText}>{faq.q}</Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#D97706"
                        />
                      </View>
                      {isExpanded && <Text style={styles.faqAnswerText}>{faq.a}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 4: Account & Security */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="shield-outline" size={16} color="#DC2626" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Account & Security</Text>
                  <Text style={styles.cardSubtitle}>Manage session and permanent account actions</Text>
                </View>
              </View>

              {/* Sign Out Option */}
              <View style={styles.securityRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.securityTitle}>Sign Out</Text>
                  <Text style={styles.securitySubtitle}>Safely log out of this device.</Text>
                </View>
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={16} color="#0F172A" />
                  <Text style={styles.logoutBtnText}>Log Out</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Delete Account Option */}
              <View style={styles.securityRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.securityTitle, { color: '#DC2626' }]}>Delete Account</Text>
                  <Text style={styles.securitySubtitle}>
                    Permanently wipe your account and data. This action is irreversible.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => setIsDeleteModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* ================= GUEST VIEW ================= */
          <View style={styles.guestContainer}>
            <View style={styles.guestIconCircle}>
              <Ionicons name="person-outline" size={48} color="#D97706" />
            </View>
            <Text style={styles.guestTitle}>Hi, Guest!</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to manage your tickets, access entry passes, and update your personal details.
            </Text>
            <TouchableOpacity
              style={styles.guestLoginButton}
              onPress={() => router.push('/auth')}
              activeOpacity={0.8}
            >
              <Text style={styles.guestLoginText}>Login / Register</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestBrowseButton}
              onPress={() => router.push('/(tabs)/movies')}
              activeOpacity={0.8}
            >
              <Text style={styles.guestBrowseText}>Explore Live Events</Text>
            </TouchableOpacity>

            {/* Help Center & FAQs for Guests */}
            <View style={[styles.card, { marginTop: 20, width: '100%' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="help-circle" size={18} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Help Center & FAQs</Text>
                  <Text style={styles.cardSubtitle}>Australian ticketing assistance & FAQs</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.helpCallBanner}
                activeOpacity={0.8}
                onPress={() =>
                  Linking.openURL('tel:0455600003').catch(() => {
                    Alert.alert('Australian Support', 'Call us at 0455 600 003 for direct concierge assistance.');
                  })
                }
              >
                <View style={styles.helpCallIconBox}>
                  <Ionicons name="headset" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.helpCallTitle}>Australian Phone Support</Text>
                  <Text style={styles.helpCallSubtitle}>Call 0455 600 003 • 7 Days a Week</Text>
                </View>
                <View style={styles.callNowBadge}>
                  <Text style={styles.callNowBadgeText}>Call Now</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.faqList}>
                {PROFILE_FAQS.map((faq, index) => {
                  const isExpanded = expandedFaq === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.faqItem}
                      onPress={() => setExpandedFaq(isExpanded ? null : index)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.faqQuestionRow}>
                        <Text style={styles.faqQuestionText}>{faq.q}</Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#D97706"
                        />
                      </View>
                      {isExpanded && <Text style={styles.faqAnswerText}>{faq.a}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={isDeleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Ionicons name="warning-outline" size={32} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalMessage}>
              Are you sure? All personal details and tickets will be permanently removed. This action
              cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Yes, Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    backgroundColor: '#F8FAFC',
  },
  sectionContainer: {
    gap: 18,
  },
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F6C636',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F6C636',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  inputHelp: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6C636',
    height: 48,
    borderRadius: 12,
    marginTop: 6,
    gap: 8,
    shadowColor: '#F6C636',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  ticketsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
  },
  ticketsBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F6C636',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketsBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  ticketsBannerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  securitySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  guestContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  guestIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 26,
    maxWidth: 290,
  },
  guestLoginButton: {
    width: '100%',
    backgroundColor: '#F6C636',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#F6C636',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  guestLoginText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  guestBrowseButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBrowseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  helpCallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
    marginBottom: 14,
  },
  helpCallIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCallTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  helpCallSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
    marginTop: 1,
  },
  callNowBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  callNowBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  faqList: {
    gap: 8,
  },
  faqItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  faqAnswerText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
