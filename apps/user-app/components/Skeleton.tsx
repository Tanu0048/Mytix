import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: windowWidth } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle | any;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1200, // Smooth shiny speed
        useNativeDriver: true,
      })
    ).start();
  }, [animatedValue]);

  // Translate from Top-Right to Bottom-Left
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [windowWidth, -windowWidth],
  });
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-windowWidth, windowWidth],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E8ECEF', // Light grey base
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <AnimatedLinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
        start={{ x: 1, y: 0 }} // Top Right
        end={{ x: 0, y: 1 }}   // Bottom Left
        style={[
          StyleSheet.absoluteFill,
          {
            width: '200%',
            height: '200%',
            top: '-50%',
            left: '-50%',
            transform: [{ translateX }, { translateY }],
          },
        ]}
      />
    </Animated.View>
  );
}

export { Skeleton as SkeletonBone };
