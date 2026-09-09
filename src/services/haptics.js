import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Servicio de respuesta háptica táctil para teléfonos Android.
 * Brinda feedback físico sutil al tocar botones, cambiar de pestaña o pasar páginas.
 * Incluye fallback automático a navigator.vibrate para navegadores móviles.
 */

// Detectar si está en entorno nativo o PWA móvil
const canVibrateWeb = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const hapticLight = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    if (canVibrateWeb) {
      try { navigator.vibrate(10); } catch {}
    }
  }
};

export const hapticMedium = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    if (canVibrateWeb) {
      try { navigator.vibrate(20); } catch {}
    }
  }
};

export const hapticSuccess = async () => {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    if (canVibrateWeb) {
      try { navigator.vibrate([15, 40, 20]); } catch {}
    }
  }
};

export const hapticSelection = async () => {
  try {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
  } catch {
    if (canVibrateWeb) {
      try { navigator.vibrate(8); } catch {}
    }
  }
};
