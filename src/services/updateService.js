import { APP_VERSION, BUILD_DATE, DEFAULT_REPO } from '../config/version';
import { get, set } from 'idb-keyval';

const SETTINGS_KEY = 'app_update_settings';
const LAST_CHECK_KEY = 'app_last_update_check';

// Comparador de versiones semánticas (ej: '1.1.0' > '1.0.0')
export function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const clean1 = v1.replace(/^v/i, '').split('.').map(n => parseInt(n) || 0);
  const clean2 = v2.replace(/^v/i, '').split('.').map(n => parseInt(n) || 0);
  const len = Math.max(clean1.length, clean2.length);

  for (let i = 0; i < len; i++) {
    const num1 = clean1[i] || 0;
    const num2 = clean2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export async function getUpdateSettings() {
  try {
    const saved = await get(SETTINGS_KEY);
    return {
      autoCheck: true,
      githubRepo: DEFAULT_REPO || '',
      customUrl: '',
      ...saved,
    };
  } catch {
    return {
      autoCheck: true,
      githubRepo: DEFAULT_REPO || '',
      customUrl: '',
    };
  }
}

export async function saveUpdateSettings(settings) {
  try {
    await set(SETTINGS_KEY, settings);
    return settings;
  } catch (err) {
    console.error('Error saving update settings:', err);
    return settings;
  }
}

export async function getLastCheckTime() {
  try {
    return (await get(LAST_CHECK_KEY)) || null;
  } catch {
    return null;
  }
}

export async function setLastCheckTime() {
  try {
    const now = Date.now();
    await set(LAST_CHECK_KEY, now);
    return now;
  } catch {
    return Date.now();
  }
}

/**
 * Comprueba si hay una actualización disponible (PWA o APK en GitHub / Servidor)
 */
export async function checkForUpdates(force = false) {
  await setLastCheckTime();
  const settings = await getUpdateSettings();

  // 1. Verificar si hay actualización PWA lista en segundo plano
  let isPwaUpdate = false;
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) {
          isPwaUpdate = true;
        }
      }
    } catch (e) {
      console.warn('SW check error:', e);
    }
  }

  // 2. Si hay repositorio de GitHub configurado, consultar la última Release
  if (settings.githubRepo && settings.githubRepo.includes('/')) {
    try {
      const resp = await fetch(`https://api.github.com/repos/${settings.githubRepo.trim()}/releases/latest`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      });
      if (resp.ok) {
        const release = await resp.json();
        const latestTag = release.tag_name || release.name || '';
        const cleanLatest = latestTag.replace(/^v/i, '');

        // Buscar activo .apk en la release
        const apkAsset = release.assets?.find(a => a.name.toLowerCase().endsWith('.apk'));
        const downloadUrl = apkAsset ? apkAsset.browser_download_url : release.html_url;

        const hasNewerVersion = compareVersions(cleanLatest, APP_VERSION) > 0;

        return {
          hasUpdate: hasNewerVersion || isPwaUpdate,
          currentVersion: APP_VERSION,
          latestVersion: cleanLatest || APP_VERSION,
          releaseName: release.name || `Versión ${latestTag}`,
          releaseNotes: release.body || 'Correcciones de errores y mejoras de rendimiento.',
          downloadUrl,
          isApk: !!apkAsset,
          isPwaUpdate,
          publishedAt: release.published_at,
          source: 'github',
        };
      }
    } catch (err) {
      console.warn('GitHub release check error:', err);
    }
  }

  // 3. Consultar URL personalizada o archivo version.json local/remoto
  const targetUrl = settings.customUrl || '/version.json';
  try {
    const resp = await fetch(targetUrl + '?t=' + Date.now(), { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json();
      const latestVersion = data.version || APP_VERSION;
      const hasNewerVersion = compareVersions(latestVersion, APP_VERSION) > 0;

      return {
        hasUpdate: hasNewerVersion || isPwaUpdate,
        currentVersion: APP_VERSION,
        latestVersion,
        releaseName: `Versión ${latestVersion}`,
        releaseNotes: Array.isArray(data.notes) ? data.notes.join('\n• ') : (data.notes || 'Mejoras y correcciones.'),
        downloadUrl: data.downloadUrl || data.apkUrl || '',
        isApk: (data.downloadUrl || data.apkUrl || '').toLowerCase().endsWith('.apk'),
        isPwaUpdate,
        publishedAt: data.buildDate || null,
        source: 'version.json',
      };
    }
  } catch (err) {
    console.warn('version.json check error:', err);
  }

  // Si solo hay actualización PWA
  if (isPwaUpdate) {
    return {
      hasUpdate: true,
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION,
      releaseName: 'Actualización en caliente',
      releaseNotes: 'Hay una nueva versión de la interfaz disponible con mejoras y arreglos.',
      downloadUrl: '',
      isPwaUpdate: true,
      source: 'pwa',
    };
  }

  return {
    hasUpdate: false,
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    releaseNotes: '',
    downloadUrl: '',
    isPwaUpdate: false,
  };
}

/**
 * Aplica o descarga la actualización
 */
export function applyUpdate(updateInfo) {
  if (updateInfo.isPwaUpdate) {
    // Si es PWA, enviar mensaje al service worker y recargar
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
    return;
  }

  if (updateInfo.downloadUrl) {
    // Abrir enlace para descargar APK o abrir repositorio
    window.open(updateInfo.downloadUrl, '_blank');
  }
}
