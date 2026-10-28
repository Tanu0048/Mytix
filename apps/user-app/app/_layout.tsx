import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useEffect, useState, useRef } from 'react';
import { View, Image, Animated, StyleSheet, StatusBar, Dimensions, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { CustomAlertModal } from '@/components/CustomAlert';

const SPLASH_IMAGE = require('../assets/images/Mytix Events_ Your Next Unforgettable Moment.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const splashFadeAnim = useRef(new Animated.Value(1)).current;

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Hide native splash so our custom high-res animated splash displays cleanly
      SplashScreen.hideAsync().catch(() => {});

      // Keep splash visible for 5 seconds as requested, then smoothly fade out
      const timer = setTimeout(() => {
        Animated.timing(splashFadeAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }).start(() => {
          setIsSplashVisible(false);
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [loaded]);

  // Automatic Over-The-Air (OTA) update check
  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Silently continue if offline or in dev
      }
    }

    if (!__DEV__) {
      onFetchUpdateAsync();
    }
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.rootContainer}>
        <RootLayoutNav />
        <CustomAlertModal />

        {isSplashVisible && (
          <Animated.View
            style={[
              styles.splashContainer,
              {
                opacity: splashFadeAnim,
              },
            ]}
            pointerEvents={isSplashVisible ? 'auto' : 'none'}
          >
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <Image
              source={SPLASH_IMAGE}
              style={styles.splashImage}
              resizeMode="cover"
            />
          </Animated.View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="orders" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  splashContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 99999,
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
