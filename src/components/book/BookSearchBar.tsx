import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { TextInput } from '../ui/TextInput';
import { searchBooks, fetchByIsbn, GoogleBooksError, type GoogleBookResult } from '../../lib/googleBooks';
import { Colors, Fonts, FontSizes, Radius, Spacing, Shadows } from '../../constants/theme';

interface BookSearchBarProps {
  onSelect: (book: GoogleBookResult) => void;
}

export function BookSearchBar({ onSelect }: BookSearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearchError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const found = await searchBooks(query);
        setResults(found);
      } catch (e) {
        console.error('[BookSearch]', e);
        setResults([]);
        const isRateLimit = e instanceof GoogleBooksError && e.status === 429;
        setSearchError(isRateLimit ? t('book.errors.searchUnavailable') : t('book.errors.searchFailed'));
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (book: GoogleBookResult) => {
    setQuery('');
    setResults([]);
    setSearchError(null);
    onSelect(book);
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) return;
    }
    setScanned(false);
    setScannerOpen(true);
  };

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned || scanLoading) return;
    setScanned(true);
    setScanLoading(true);

    try {
      const book = await fetchByIsbn(data);
      setScanLoading(false);
      setScannerOpen(false);
      if (book) {
        onSelect(book);
      }
    } catch (e) {
      console.error('[ISBNScan]', e);
      setScanLoading(false);
      setScannerOpen(false);
      const isRateLimit = e instanceof GoogleBooksError && e.status === 429;
      setScanError(isRateLimit ? t('book.errors.searchUnavailable') : t('book.errors.searchFailed'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder={t('book.searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            containerStyle={styles.searchInput}
            rightIcon={
              loading ? (
                <ActivityIndicator size="small" color={Colors.secondary} />
              ) : query.length > 0 ? (
                <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={openScanner} activeOpacity={0.7}>
          <Text style={styles.scanIcon}>📷</Text>
        </TouchableOpacity>
      </View>

      {(searchError || scanError) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{searchError ?? scanError}</Text>
        </View>
      )}

      {results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.thumbnail} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                    <Text style={styles.thumbnailIcon}>📕</Text>
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
                  {item.author && (
                    <Text style={styles.resultAuthor} numberOfLines={1}>{item.author}</Text>
                  )}
                  {item.totalPages && (
                    <Text style={styles.resultPages}>
                      {t('book.pagesCount', { count: item.totalPages })}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ISBN Scanner Modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
            onBarcodeScanned={handleBarcode}
          />

          {/* Overlay */}
          <View style={styles.scannerOverlay} pointerEvents="none">
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>{t('book.scanHint')}</Text>
          </View>

          {scanLoading && (
            <View style={styles.scanLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}

          <TouchableOpacity style={styles.scanCloseButton} onPress={() => setScannerOpen(false)}>
            <Text style={styles.scanCloseText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
  },
  searchInput: {
    marginBottom: 0,
  },
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  scanIcon: { fontSize: 22 },
  clearIcon: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    padding: 2,
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
    ...Shadows.md,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  thumbnail: {
    width: 40,
    height: 60,
    borderRadius: Radius.sm,
  },
  thumbnailPlaceholder: {
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailIcon: { fontSize: 20 },
  resultInfo: { flex: 1 },
  resultTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  resultAuthor: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  resultPages: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },

  errorBanner: {
    backgroundColor: '#FDECEA',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  errorBannerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },

  // Scanner
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 120,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
  scanHint: {
    marginTop: Spacing.lg,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanCloseButton: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    ...Shadows.md,
  },
  scanCloseText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
});
