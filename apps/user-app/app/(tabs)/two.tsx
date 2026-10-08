import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Re-check user data every time this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            setUser(JSON.parse(userData));
          } else {
            setUser(null);
          }
        } catch (e) {
          setUser(null);
        }
      };
      loadUser();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['user', 'token', 'refreshToken']);
          setUser(null);
        },
      },
    ]);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        {user ? (
          /* ===== LOGGED IN VIEW ===== */
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user.name || 'U')}</Text>
              </View>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#f84464" />
                <Text style={styles.roleText}>{user.role || 'User'}</Text>
              </View>
            </View>

            <View style={styles.menuList}>
              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="ticket-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>My Bookings</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="heart-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>Wishlist</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="notifications-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>Notifications</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="help-buoy-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>Help & Support</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="settings-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>Settings</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#f84464" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* ===== GUEST VIEW ===== */
          <>
            <View style={styles.guestCard}>
              <Ionicons name="person-circle-outline" size={80} color="#ccc" />
              <Text style={styles.guestTitle}>Hi, Guest!</Text>
              <Text style={styles.guestSubtitle}>
                Login to book tickets, manage events & more.
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/auth')}
              >
                <Text style={styles.loginButtonText}>Login / Register</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuList}>
              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="help-buoy-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>Help & Support</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="settings-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>Settings</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  /* ===== Logged In Styles ===== */
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f84464',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#f84464',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: '#fff0f3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f84464',
    textTransform: 'capitalize',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f84464',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f84464',
  },
  /* ===== Guest Styles ===== */
  guestCard: {
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 24,
    borderRadius: 16,
    marginBottom: 30,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  guestSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#f84464',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  /* ===== Menu Styles ===== */
  menuList: {
    gap: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
});
