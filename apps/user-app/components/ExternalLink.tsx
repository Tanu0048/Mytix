import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Linking, Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ExternalLink({ href, children, style }: ExternalLinkProps) {
  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      try {
        await WebBrowser.openBrowserAsync(href);
      } catch {
        await Linking.openURL(href);
      }
    } else {
      if (typeof window !== 'undefined') {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <Pressable onPress={handlePress} style={style}>
      {children}
    </Pressable>
  );
}
