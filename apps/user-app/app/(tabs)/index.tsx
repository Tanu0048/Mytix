import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text, Image, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Skeleton from '../../components/Skeleton';

const { width } = Dimensions.get('window');

// Use laptop's local IP address so physical device (Expo Go) can connect to the backend
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const BACKEND_HOST = process.env.EXPO_PUBLIC_BACKEND_URL;

const CATEGORIES = [
  { id: '1', title: 'Movies', icon: '🍿' },
  { id: '2', title: 'HSBC Lounge', icon: '🎫' },
  { id: '3', title: 'Navratri', icon: '💃' },
  { id: '4', title: 'Music Shows', icon: '🎤' },
  { id: '5', title: 'Performances', icon: '🎭' },
  { id: '6', title: 'Comedy', icon: '😂' },
];

const FALLBACK_BANNERS = [
  { id: 'b1', imageUrl: 'https://images.unsplash.com/photo-1533174000222-386d4e5ff042?w=800&q=80' },
  { id: 'b2', imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80' },
];

const FALLBACK_MOVIES: any[] = [];

// Helper: if posterPath is relative like /banner/xyz.avif, prepend backend host
function getFullImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${BACKEND_HOST}${path}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [banners, setBanners] = useState<any[]>(FALLBACK_BANNERS);
  const [movies, setMovies] = useState<any[]>(FALLBACK_MOVIES);
  const [loading, setLoading] = useState(true);
  const scrollRef = React.useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);

  // Load user name from AsyncStorage every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const parsed = JSON.parse(userData);
            setUserName(parsed.name || null);
          } else {
            setUserName(null);
          }
        } catch (e) {
          setUserName(null);
        }
      };
      loadUser();
    }, [])
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bannerRes, homeRes] = await Promise.all([
          fetch(`${API_BASE}/banners`).catch(() => null),
          fetch(`${API_BASE}/home`).catch(() => null)
        ]);

        if (bannerRes?.ok) {
          const bannerData = await bannerRes.json();
          if (bannerData.data && bannerData.data.length > 0) {
            setBanners(bannerData.data);
          }
        }

        if (homeRes?.ok) {
          const homeData = await homeRes.json();
          const trending = [...(homeData.featuredEvents || []), ...(homeData.trendingEvents || [])];
          if (trending.length > 0) {
            setMovies(trending.slice(0, 5));
          }
        }
      } catch (error) {
        console.error('Error fetching data for app:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const intervalId = setInterval(() => {
      setActiveSlide((prev) => {
        const nextSlide = (prev + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: nextSlide * width, animated: true });
        return nextSlide;
      });
    }, 3000);

    return () => clearInterval(intervalId);
  }, [banners.length]);

  const onMomentumScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    setActiveSlide(index);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>It All Starts Here!</Text>
          <Text style={styles.headerLocation}>Gurugram (Gurgaon) ›</Text>
        </View>
        <View style={styles.headerIcons}>
          {userName && (
            <TouchableOpacity style={styles.userProfile} onPress={() => router.push('/two')}>
              <View style={styles.userIconCircle}>
                <Text style={styles.userIconText}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.userNameText}>{userName.split(' ')[0]}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Location Banner Removed */}

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.categoryItem}>
              <View style={styles.categoryIconCircle}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryTitle}>{cat.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Main Carousel / Banners from backend */}
        <ScrollView 
          ref={scrollRef}
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false} 
          style={styles.carouselContainer}
          onMomentumScrollEnd={onMomentumScrollEnd}
        >
           {loading ? (
             <View style={styles.bannerContainer}>
               <Skeleton width={width - 32} height={180} borderRadius={10} />
             </View>
           ) : banners.map((slide, index) => (
             <View key={slide.id || index.toString()} style={styles.bannerContainer}>
               <Image 
                 source={{ uri: slide.imageUrl || FALLBACK_BANNERS[0].imageUrl }} 
                 style={styles.mainBanner}
                 resizeMode="stretch"
               />
             </View>
           ))}
        </ScrollView>
        <View style={styles.paginationDots}>
          {banners.map((_, i) => (
            <View key={i.toString()} style={[styles.dot, i === activeSlide ? styles.activeDot : null]} />
          ))}
        </View>

        {/* Secondary Banner */}
        <View style={styles.secondaryBannerContainer}>
           <Image 
             source={{ uri: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80' }} 
             style={styles.secondaryBanner}
             resizeMode="cover"
           />
        </View>

        {/* Recommended Movies / Trending Events */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended Events</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All ›</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moviesContainer}>
          {loading ? (
            [1, 2, 3].map((_, i) => (
              <View key={i} style={styles.movieCard}>
                <Skeleton width={130} height={200} borderRadius={8} style={{ marginBottom: 8 }} />
                <Skeleton width={100} height={16} style={{ marginBottom: 4 }} />
                <Skeleton width={80} height={12} />
              </View>
            ))
          ) : movies.length > 0 ? movies.map((movie, index) => (
            <TouchableOpacity key={movie.id || index.toString()} style={styles.movieCard} onPress={() => router.push(`/event/${movie.slug || movie.id}` as any)}>
              <Image 
                source={{ uri: getFullImageUrl(movie.posterPath) || 'https://via.placeholder.com/300x400?text=No+Image' }} 
                style={styles.moviePoster} 
                resizeMode="cover" 
              />
              <Text style={styles.movieTitle} numberOfLines={1}>{movie.title}</Text>
              {movie.venue?.city && (
                <Text style={styles.movieSubtitle} numberOfLines={1}>📍 {movie.venue.city}</Text>
              )}
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No events found. Check back later!</Text>
            </View>
          )}
        </ScrollView>

      </ScrollView>

      {/* Floating Explore Button Removed */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
  },
  headerLocation: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  userProfile: {
    alignItems: 'center',
    marginRight: 10,
    marginLeft: 5,
  },
  userIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3457D5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userNameText: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
    fontWeight: '600',
  },
  iconPlaceholder: {
    fontSize: 22,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  locationBanner: {
    backgroundColor: '#3457D5', // BookMyShow blue
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  locationBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 20,
  },
  categoryItem: {
    alignItems: 'center',
    width: 65,
  },
  categoryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryTitle: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
  },
  carouselContainer: {
    marginBottom: 10,
  },
  bannerContainer: {
    width: width,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBanner: {
    width: '100%',
    aspectRatio: 2.5, // Reduced height by another 20%
    borderRadius: 16, // More rounded borders
  },
  paginationDots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d3d3d3',
  },
  activeDot: {
    backgroundColor: '#3457D5',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  secondaryBannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 25,
  },
  secondaryBanner: {
    width: '100%',
    height: 70,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  seeAll: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '600',
  },
  moviesContainer: {
    paddingHorizontal: 16,
    gap: 15,
  },
  movieCard: {
    width: width * 0.4,
  },
  moviePoster: {
    width: '100%',
    height: width * 0.55,
    borderRadius: 12,
  },
  movieTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  movieSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: '#666',
    textAlign: 'center'
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: width - 32,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  floatingButton: {
    backgroundColor: '#3457D5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  }
});
