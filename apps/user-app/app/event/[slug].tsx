import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../../components/Skeleton';

const { width } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const BACKEND_HOST = process.env.EXPO_PUBLIC_BACKEND_URL;

function getFullImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${BACKEND_HOST}${path}`;
}

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data);
        } else {
          // Fallback if event is not found (for testing dummy data)
          setEvent({
            title: typeof slug === 'string' ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Event Details',
            startsAt: new Date(Date.now() + 864000000).toISOString(),
            description: 'Join us for an unforgettable night! Experience the biggest hits live with spectacular stage production.\n\nGrab your tickets before they sell out.',
            venue: { name: 'City Center Venue', city: 'Gurugram' },
            ticketTypes: [{ priceCents: 49900 }],
            posterPath: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80'
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <View style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </View>
        </View>
        <Skeleton width={width} height={width * 1.2} borderRadius={0} />
        <View style={styles.detailsContainer}>
          <Skeleton width={200} height={32} style={{ marginBottom: 15 }} />
          <Skeleton width={150} height={20} style={{ marginBottom: 10 }} />
          <Skeleton width={180} height={20} style={{ marginBottom: 20 }} />
          <Skeleton width={100} height={24} style={{ marginTop: 20, marginBottom: 10 }} />
          <Skeleton width={width - 40} height={16} style={{ marginBottom: 8 }} />
          <Skeleton width={width - 40} height={16} style={{ marginBottom: 8 }} />
          <Skeleton width={width - 100} height={16} />
        </View>
        <View style={styles.bottomBar}>
          <View>
            <Skeleton width={40} height={14} style={{ marginBottom: 5 }} />
            <Skeleton width={80} height={24} />
          </View>
          <Skeleton width={140} height={50} borderRadius={10} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text>Event not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: false
      }} />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Image 
          source={{ uri: getFullImageUrl(event.posterPath) || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80' }} 
          style={styles.poster} 
          resizeMode="cover" 
        />
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {new Date(event.startsAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          {event.venue && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ''}
              </Text>
            </View>
          )}
          
          <Text style={styles.sectionTitle}>About the Event</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>
            {event.ticketTypes?.[0]?.priceCents ? `₹${(event.ticketTypes[0].priceCents / 100).toFixed(2)}` : 'Free'}
          </Text>
        </View>
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Book Tickets</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  poster: {
    width: width,
    height: width * 1.2,
  },
  detailsContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  bookButton: {
    backgroundColor: '#f84464',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
