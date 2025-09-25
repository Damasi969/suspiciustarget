/**
 * Utility per il rilevamento dello stato della rete
 */

export interface NetworkStatus {
  isOnline: boolean;
  canLoadTiles: boolean;
}

/**
 * Controlla se la rete è disponibile
 */
export const checkNetworkStatus = async (): Promise<NetworkStatus> => {
  // Controlla il navigator.onLine
  const isOnline = navigator.onLine;
  
  if (!isOnline) {
    return { isOnline: false, canLoadTiles: false };
  }

  // Test per verificare se possiamo effettivamente caricare tile
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://tile.openstreetmap.org/0/0/0.png', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });

    clearTimeout(timeoutId);
    
    return {
      isOnline: true,
      canLoadTiles: response.ok
    };
  } catch (error) {
    return { isOnline: true, canLoadTiles: false };
  }
};

/**
 * Controlla se una tile è disponibile nella cache del browser
 */
export const checkTileInCache = async (url: string): Promise<boolean> => {
  try {
    const cache = await caches.open('map-tiles-cache');
    const response = await cache.match(url);
    return !!response;
  } catch {
    return false;
  }
};

/**
 * Controlla se ci sono tile cached per il livello di zoom corrente
 */
export const checkCacheForZoom = async (z: number, centerLat: number, centerLng: number, radius: number = 2): Promise<boolean> => {
  try {
    const cache = await caches.open('map-tiles-cache');
    
    // Calcola tile x,y per il centro
    const centerX = Math.floor((centerLng + 180) / 360 * Math.pow(2, z));
    const centerY = Math.floor((1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    
    // Controlla alcune tile intorno al centro
    let cachedCount = 0;
    let totalChecked = 0;
    
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const tileUrl = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
        const response = await cache.match(tileUrl);
        if (response) cachedCount++;
        totalChecked++;
      }
    }
    
    // Considera la cache sufficiente se almeno il 30% delle tile sono cached
    return cachedCount / totalChecked >= 0.3;
  } catch {
    return false;
  }
};

/**
 * Hook per monitorare lo stato della rete
 */
export const useNetworkStatus = (callback?: (status: NetworkStatus) => void) => {
  const checkStatus = async () => {
    const status = await checkNetworkStatus();
    callback?.(status);
    return status;
  };

  // Listener per eventi online/offline
  const handleOnline = () => checkStatus();
  const handleOffline = () => {
    const status = { isOnline: false, canLoadTiles: false };
    callback?.(status);
  };

  // Aggiungi event listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  const cleanup = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };

  return { checkStatus, cleanup };
};