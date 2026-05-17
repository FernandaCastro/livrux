import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, View, Text, FlatList, StyleSheet, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useReaders } from '../hooks/useReaders';
import { useReaderStore } from '../stores/readerStore';
import { useParentalGuard } from '../hooks/useParentalGuard';
import { PinModal } from './PinModal';
import { MultiavatarView } from './reader/MultiavatarView';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../constants/theme';
import type { Reader } from '../types';

const OPEN_MS = 300;
const CLOSE_MS = 220;
const SHEET_TRANSLATE_Y = 400;

interface ReaderSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ReaderSelectorSheet({ visible, onClose }: ReaderSelectorSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { readers } = useReaders();
  const { setSelectedReader, selectedReader } = useReaderStore();
  const { requireReaderPin, modalProps } = useParentalGuard();

  const [mounted, setMounted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SHEET_TRANSLATE_Y)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) => dy > 8 && Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) slideAnim.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 100 || vy > 0.5) {
          onClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 220,
            mass: 0.8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: OPEN_MS, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }),
        Animated.timing(slideAnim, {
          toValue: SHEET_TRANSLATE_Y,
          duration: CLOSE_MS,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const handleSelectReader = (reader: Reader) => {
    requireReaderPin(reader, () => {
      setSelectedReader(reader);
      router.push('/app/reader');
      onClose();
    });
  };

  const handleGoHome = () => {
    setSelectedReader(null);
    router.replace('/');
    onClose();
  };

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {modalProps && <PinModal {...modalProps} />}

      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheetWrap, { bottom: insets.bottom, transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={['#F5F0FF', '#FEFBFF', '#FFFAF4']}
          locations={[0, 0.3, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sheet}
        >
          {/* Handle — drag area to close */}
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* Home row */}
          <Pressable style={styles.homeRow} onPress={handleGoHome} android_ripple={{ color: Colors.secondaryLight }}>
            <View style={styles.homeIconWrap}>
              <Image source={require('../../assets/readers.png')} style={styles.homeIcon} resizeMode="contain" />
            </View>
            <Text style={styles.homeLabel}>{t('home.title')}</Text>
          </Pressable>

          <View style={styles.divider} />

          <FlatList
            data={readers}
            keyExtractor={(item) => item.id}
            scrollEnabled={readers.length > 5}
            renderItem={({ item }) => {
              const isActive = selectedReader?.id === item.id;
              return (
                <Pressable
                  style={[styles.readerRow, isActive && styles.readerRowActive]}
                  onPress={() => handleSelectReader(item)}
                  android_ripple={{ color: Colors.secondaryLight }}
                >
                  {/* Active accent strip */}
                  {isActive && <View style={styles.activeStrip} />}

                  <MultiavatarView
                    seed={item.avatar_seed}
                    size={40}
                    borderColor={isActive ? Colors.secondary : undefined}
                    borderWidth={isActive ? 2 : 0}
                  />
                  <Text style={[styles.readerName, isActive && styles.readerNameActive]}>
                    {item.name}
                  </Text>
                  {isActive && <Text style={styles.activeCheck}>✓</Text>}
                </Pressable>
              );
            }}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing['2xl'],
    overflow: 'hidden',
    ...Shadows.lg,
  },
  handleArea: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.secondaryLight,
  },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  homeIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIcon: { width: 60, height: 60 },
  homeLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  readerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  readerRowActive: {
    backgroundColor: Colors.secondaryLight,
  },
  activeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.secondary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  readerName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  readerNameActive: {
    fontFamily: Fonts.bodyBold,
    color: Colors.secondary,
  },
  activeCheck: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.secondary,
  },
});
