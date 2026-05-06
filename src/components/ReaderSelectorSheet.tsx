import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, Pressable, Image } from 'react-native';
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
  const { readers } = useReaders();
  const { setSelectedReader, selectedReader } = useReaderStore();
  const { requireReaderPin, modalProps } = useParentalGuard();

  // Keep the Modal mounted while the close animation plays.
  const [mounted, setMounted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SHEET_TRANSLATE_Y)).current;

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
      router.push(`/app/reader/${reader.id}`);
      onClose();
    });
  };

  const handleGoHome = () => {
    setSelectedReader(null);
    router.replace('/app');
    onClose();
  };

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {modalProps && <PinModal {...modalProps} />}

      {/* Animated backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Animated sheet */}
      <Animated.View
        style={[styles.sheetWrap, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <TouchableOpacity style={styles.homeRow} onPress={handleGoHome} activeOpacity={0.75}>
            <View style={styles.homeIconWrap}>
              <Image source={require('../../assets/readers.png')} style={styles.homeIcon} resizeMode="contain"/>
            </View>
            <Text style={styles.homeLabel}>{t('home.title')}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <FlatList
            data={readers}
            keyExtractor={(item) => item.id}
            scrollEnabled={readers.length > 5}
            renderItem={({ item }) => {
              const isActive = selectedReader?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.readerRow, isActive && styles.readerRowActive]}
                  onPress={() => handleSelectReader(item)}
                  activeOpacity={0.75}
                >
                  <MultiavatarView seed={item.avatar_seed} size={40} />
                  <Text style={[styles.readerName, isActive && styles.readerNameActive]}>
                    {item.name}
                  </Text>
                  {isActive && <Text style={styles.activeCheck}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Animated.View>
    </Modal>
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
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing['2xl'],
    ...Shadows.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
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
    backgroundColor: Colors.surfaceVariant,
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
  },
  readerRowActive: {
    backgroundColor: Colors.surfaceVariant,
  },
  readerName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  readerNameActive: {
    fontFamily: Fonts.bodyBold,
    color: Colors.primary,
  },
  activeCheck: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
});
