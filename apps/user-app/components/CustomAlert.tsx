import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
  AlertButton as RNAlertButton,
  AlertOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type AlertButton = RNAlertButton;

export interface CustomAlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions & {
    type?: 'success' | 'destructive' | 'logout' | 'warning' | 'error' | 'support' | 'info';
  };
  type?: 'success' | 'destructive' | 'logout' | 'warning' | 'error' | 'support' | 'info';
}

type AlertListener = (config: CustomAlertConfig | null) => void;

class CustomAlertManager {
  private listener: AlertListener | null = null;
  private currentConfig: CustomAlertConfig | null = null;

  setListener(listener: AlertListener | null) {
    this.listener = listener;
    if (this.currentConfig && this.listener) {
      this.listener(this.currentConfig);
    }
  }

  show(config: CustomAlertConfig) {
    this.currentConfig = config;
    if (this.listener) {
      this.listener(config);
    }
  }

  hide() {
    this.currentConfig = null;
    if (this.listener) {
      this.listener(null);
    }
  }
}

export const alertManager = new CustomAlertManager();

/**
 * Programmatic helper to trigger the custom alert modal
 */
export function showCustomAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean; onDismiss?: () => void; type?: CustomAlertConfig['type'] }
) {
  alertManager.show({
    title,
    message,
    buttons,
    options,
    type: options?.type,
  });
}

// Monkey-patch React Native's default Alert.alert so ANY call across the entire app
// automatically opens this sleek, professional branded dialog instead of the raw OS popup!
const originalAlert = Alert.alert;
Alert.alert = (title: string, message?: string, buttons?: AlertButton[], options?: any) => {
  showCustomAlert(title, message, buttons, options);
};

export { originalAlert };

export function CustomAlertModal() {
  const [config, setConfig] = useState<CustomAlertConfig | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const handleAlert = (nextConfig: CustomAlertConfig | null) => {
      if (nextConfig) {
        setConfig(nextConfig);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }).start(() => {
          setConfig(null);
          scaleAnim.setValue(0.92);
        });
      }
    };

    alertManager.setListener(handleAlert);
    return () => {
      alertManager.setListener(null);
    };
  }, [fadeAnim, scaleAnim]);

  if (!config) return null;

  const { title, message, buttons = [{ text: 'OK', style: 'default' }], options, type } = config;

  // Auto-detect dialog theme if not explicitly provided
  const lowerTitle = (title || '').toLowerCase();
  const lowerMsg = (message || '').toLowerCase();
  const hasDestructive = buttons.some((b) => b.style === 'destructive');

  let alertType: CustomAlertConfig['type'] = type || 'info';

  if (!type) {
    if (lowerTitle.includes('sign out') || lowerTitle.includes('log out') || lowerMsg.includes('log out')) {
      alertType = 'logout';
    } else if (
      hasDestructive ||
      lowerTitle.includes('delete') ||
      lowerTitle.includes('remove') ||
      lowerMsg.includes('permanently removed')
    ) {
      alertType = 'destructive';
    } else if (
      lowerTitle.includes('success') ||
      lowerTitle.includes('confirmed') ||
      lowerTitle.includes('updated') ||
      lowerTitle.includes('🎉')
    ) {
      alertType = 'success';
    } else if (
      lowerTitle.includes('sold out') ||
      lowerTitle.includes('closed') ||
      lowerTitle.includes('limit') ||
      lowerTitle.includes('insufficient') ||
      lowerTitle.includes('warning')
    ) {
      alertType = 'warning';
    } else if (lowerTitle.includes('support') || lowerTitle.includes('call') || lowerTitle.includes('assistance')) {
      alertType = 'support';
    } else if (lowerTitle.includes('error') || lowerTitle.includes('failed')) {
      alertType = 'error';
    }
  }

  // Choose icon and color scheme based on alertType
  let iconName: keyof typeof Ionicons.glyphMap = 'information-circle-outline';
  let iconColor = '#0F172A';
  let iconBgColor = '#F1F5F9';

  switch (alertType) {
    case 'logout':
      iconName = 'log-out-outline';
      iconColor = '#DC2626';
      iconBgColor = '#FEE2E2';
      break;
    case 'destructive':
      iconName = 'trash-outline';
      iconColor = '#DC2626';
      iconBgColor = '#FEE2E2';
      break;
    case 'success':
      iconName = 'checkmark-circle-outline';
      iconColor = '#059669';
      iconBgColor = '#D1FAE5';
      break;
    case 'warning':
      iconName = 'alert-circle-outline';
      iconColor = '#D97706';
      iconBgColor = '#FEF3C7';
      break;
    case 'support':
      iconName = 'headset-outline';
      iconColor = '#2563EB';
      iconBgColor = '#EFF6FF';
      break;
    case 'error':
      iconName = 'alert-circle-outline';
      iconColor = '#DC2626';
      iconBgColor = '#FEE2E2';
      break;
    default:
      iconName = 'information-circle-outline';
      iconColor = '#0F172A';
      iconBgColor = '#F1F5F9';
      break;
  }

  const handleDismiss = (onPress?: () => void) => {
    alertManager.hide();
    if (onPress) {
      setTimeout(() => {
        onPress();
      }, 100);
    }
    if (options?.onDismiss) {
      options.onDismiss();
    }
  };

  const handleBackdropPress = () => {
    if (options?.cancelable === false) return;
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    if (cancelBtn) {
      handleDismiss(cancelBtn.onPress);
    } else {
      handleDismiss();
    }
  };

  const isTwoButtons = buttons.length === 2;
  const displayButtons = isTwoButtons
    ? [...buttons].sort((a, b) => {
        if (a.style === 'cancel') return -1;
        if (b.style === 'cancel') return 1;
        return 0;
      })
    : buttons;

  return (
    <Modal
      visible={Boolean(config)}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Circular Icon Badge */}
          <View style={[styles.iconBadge, { backgroundColor: iconBgColor }]}>
            <Ionicons name={iconName} size={30} color={iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {Boolean(message) && <Text style={styles.message}>{message}</Text>}

          {/* Action Buttons */}
          {isTwoButtons ? (
            <View style={styles.twoButtonRow}>
              {displayButtons.map((btn, idx) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive =
                  btn.style === 'destructive' || alertType === 'destructive' || alertType === 'logout';
                const isAction = !isCancel;

                let btnBg = '#F1F5F9';
                let btnTextColor = '#475569';

                if (isDestructive && isAction) {
                  btnBg = '#DC2626';
                  btnTextColor = '#FFFFFF';
                } else if (isAction) {
                  btnBg = '#F6C636';
                  btnTextColor = '#0F172A';
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.twoBtn, { backgroundColor: btnBg }]}
                    activeOpacity={0.85}
                    onPress={() => handleDismiss(btn.onPress)}
                  >
                    <Text style={[styles.twoBtnText, { color: btnTextColor }]}>{btn.text || 'OK'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.stackedButtonCol}>
              {buttons.map((btn, idx) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';

                let btnBg = '#0F172A';
                let btnTextColor = '#FFFFFF';

                if (isCancel) {
                  btnBg = '#F1F5F9';
                  btnTextColor = '#475569';
                } else if (isDestructive) {
                  btnBg = '#DC2626';
                  btnTextColor = '#FFFFFF';
                } else if (alertType === 'success') {
                  btnBg = '#059669';
                  btnTextColor = '#FFFFFF';
                } else if (alertType === 'warning') {
                  btnBg = '#F6C636';
                  btnTextColor = '#0F172A';
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.stackedBtn, { backgroundColor: btnBg }]}
                    activeOpacity={0.85}
                    onPress={() => handleDismiss(btn.onPress)}
                  >
                    <Text style={[styles.stackedBtnText, { color: btnTextColor }]}>{btn.text || 'OK'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 56, 360),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  twoButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  twoBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  stackedButtonCol: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  stackedBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
