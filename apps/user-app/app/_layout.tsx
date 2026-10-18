import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useEffect, useState, useRef } from 'react';
import { View, Image, Animated, StyleSheet, StatusBar } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';

const SPLASH_IMAGE = require('../assets/images/splash-screen.png');

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
      // Hide native splash immediately so our custom splash takes over seamlessly
      SplashScreen.hideAsync().catch(() => {});

      // Keep splash image visible briefly for a smooth transition, then smoothly fade out
      const timer = setTimeout(() => {
        Animated.timing(splashFadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setIsSplashVisible(false);
        });
      }, 500);

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
    <View style={styles.rootContainer}>
      <RootLayoutNav />

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
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
