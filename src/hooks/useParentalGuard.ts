import { useState } from 'react';
import type { PinModalProps } from '../components/PinModal';
import { useParentalStore } from '../stores/parentalStore';
import { useAuthStore } from '../stores/authStore';
import type { Reader } from '../types';

// Centralises parental lock logic. Components call requireParentPin / requireReaderPin
// and receive modal props to render <PinModal>.
export function useParentalGuard() {
  const { profile } = useAuthStore();
  const {
    isParentUnlocked,
    unlockParent,
    unlockReader,
    canAccessReader,
    checkExpiry,
  } = useParentalStore();

  const [modalProps, setModalProps] = useState<PinModalProps | null>(null);

  const closeModal = () => setModalProps(null);

  /** Call before accessing Settings or performing any parent-only action. */
  const requireParentPin = (onSuccess: () => void) => {
    checkExpiry();

    // No PIN configured → act as parent mode
    if (!profile?.parental_pin) {
      onSuccess();
      return;
    }

    // Already unlocked and not expired
    if (isParentUnlocked) {
      onSuccess();
      return;
    }

    const durationMinutes = profile.parental_unlock_duration ?? 5;

    setModalProps({
      visible: true,
      title: '🔑 Acesso de pais',
      subtitle: 'Digite o PIN parental',
      pinHash: profile.parental_pin,
      onSuccess: () => {
        unlockParent(durationMinutes);
        closeModal();
        onSuccess();
      },
      onCancel: closeModal,
    });
  };

  /** Call when tapping a reader card. Handles both "reader has PIN" and "reader has no PIN" cases. */
  const requireReaderPin = (reader: Reader, onSuccess: () => void) => {
    checkExpiry();

    // Parent mode always grants access
    if (isParentUnlocked) {
      onSuccess();
      return;
    }

    // Reader already unlocked this session
    if (canAccessReader(reader.id)) {
      onSuccess();
      return;
    }

    // No PIN on this reader → grant child access directly
    if (!reader.pin) {
      unlockReader(reader.id);
      onSuccess();
      return;
    }

    setModalProps({
      visible: true,
      title: reader.name,
      subtitle: 'Digite seu PIN',
      pinHash: reader.pin,
      onSuccess: () => {
        unlockReader(reader.id);
        closeModal();
        onSuccess();
      },
      onCancel: closeModal,
    });
  };

  return {
    requireParentPin,
    requireReaderPin,
    isParentUnlocked,
    modalProps,
    closeModal,
  };
}
