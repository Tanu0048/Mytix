import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  ViewStyle,
  Dimensions,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  baseColor?: string;
  style?: ViewStyle | any;
}

export default function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  baseColor = '#E5E7EB', // Same modern gray as website (bg-gray-200)
  style,
}: SkeletonProps) {
  // Pre-calculate estimated width so shimmer animates from frame 0
  const initialWidth =
    typeof width === 'number'
      ? width
      : typeof width === 'string' && width.endsWith('%')
      ? (parseFloat(width) / 100) * SCREEN_WIDTH
      : SCREEN_WIDTH;

  const [containerWidth, setContainerWidth] = useState<number>(initialWidth || 300);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500, // Exact 1.5s matching website shimmer
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  // Shiny shimmer sweeps across from -100% to +100% (Left to Right)
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-containerWidth, containerWidth],
  });

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 2) {
          setContainerWidth(Math.round(w));
        }
      }}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          overflow: 'hidden',
          position: 'relative',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            width: '100%',
            height: '100%',
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0)',
            'rgba(255, 255, 255, 0.35)',
            'rgba(255, 255, 255, 0.85)',
            'rgba(255, 255, 255, 0.35)',
            'rgba(255, 255, 255, 0)',
          ]}
          locations={[0, 0.3, 0.5, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.15 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function EventCardSkeleton({ style }: { style?: ViewStyle | any }) {
  return (
    <View style={[{ width: '100%' }, style]}>
      <Skeleton width="100%" height={180} borderRadius={16} style={{ marginBottom: 12 }} />
      <Skeleton width="80%" height={18} borderRadius={6} style={{ marginBottom: 8 }} />
      <Skeleton width="55%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Skeleton width="30%" height={14} borderRadius={4} />
        <Skeleton width="25%" height={14} borderRadius={4} />
      </View>
    </View>
  );
}

export function BannerSkeleton({ height = 200, style }: { height?: number; style?: ViewStyle | any }) {
  return (
    <View style={[{ width: '100%', marginBottom: 16 }, style]}>
      <Skeleton width="100%" height={height} borderRadius={20} />
    </View>
  );
}

export function EventListRowSkeleton({ style }: { style?: ViewStyle | any }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: '#F1F5F9',
        },
        style,
      ]}
    >
      <Skeleton width={70} height={70} borderRadius={12} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="75%" height={16} borderRadius={4} />
        <Skeleton width="50%" height={12} borderRadius={4} />
        <Skeleton width="35%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export { Skeleton as SkeletonBone };
