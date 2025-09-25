# Sistema Cache per Applicazione PenDrive

## 📂 Struttura Cache

```
📁 cache/
├── 📁 tiles/                  ← Tile di mappa cached
│   ├── 📁 8/                  ← Zoom level 8
│   │   ├── 📁 132/            ← Coordinata X
│   │   │   ├── 📄 95.png      ← Coordinata Y  
│   │   │   └── 📄 96.png
│   │   └── 📁 133/
│   ├── 📁 9/                  ← Zoom level 9
│   └── 📁 10/                 ← Zoom level 10
├── 📄 cache-manifest.json     ← Indice cache
└── 📄 cache-stats.json        ← Statistiche utilizzo
```

## 🔧 Configurazione Automatica

### cache-manifest.json
```json
{
  "version": "1.0.0",
  "created": "2024-01-15T10:30:00Z",
  "regions": {
    "mediterranean": {
      "bounds": {"north": 46, "south": 30, "east": 36, "west": -6},
      "cached_levels": [6, 7, 8, 9, 10],
      "tile_count": 15420,
      "size_mb": 245.6
    },
    "adriatic": {
      "bounds": {"north": 46, "south": 39, "east": 20, "west": 12},
      "cached_levels": [8, 9, 10, 11, 12],
      "tile_count": 8932,
      "size_mb": 156.3
    }
  },
  "total_size_mb": 401.9,
  "last_updated": "2024-01-15T10:30:00Z"
}
```

## 📊 Strategia di Cache

### Priorità Cache:
1. **Porti Principali** (Zoom 10-12)
2. **Rotte Commerciali** (Zoom 8-10)  
3. **Aree di Navigazione** (Zoom 6-8)
4. **Vista Generale** (Zoom 4-6)

### Calcolo Spazio Richiesto:

#### Per Zoom Level:
- **Zoom 6:** ~64 tile per regione = ~1-2 MB
- **Zoom 8:** ~1,024 tile per regione = ~16-25 MB  
- **Zoom 10:** ~16,384 tile per regione = ~250-400 MB
- **Zoom 12:** ~262,144 tile per regione = ~4-6 GB

#### Raccomandazioni PenDrive:
- **8GB:** Cache zoom 6-9 per 2-3 regioni
- **16GB:** Cache zoom 6-10 per 3-4 regioni
- **32GB:** Cache zoom 6-11 per 5+ regioni  
- **64GB+:** Cache completa zoom 6-12

## 🛠️ Script di Gestione Cache

### Pulizia Cache:
```bash
#!/bin/bash
# clean-cache.sh
echo "Pulizia cache tiles..."
find cache/tiles -name "*.png" -type f -delete
echo "Cache pulita!"
```

### Verifica Integrità:
```bash
#!/bin/bash  
# verify-cache.sh
missing=0
for zoom in {6..12}; do
  for x in cache/tiles/$zoom/*/; do
    for y in $x*.png; do
      if [ ! -f "$y" ]; then
        echo "Mancante: $y"
        ((missing++))
      fi
    done
  done
done
echo "Tile mancanti: $missing"
```

## ⚙️ Configurazione App per Cache Locale

### Modifiche src/utils/networkDetection.ts:

```javascript
// Controlla cache locale su filesystem per PenDrive
export const checkLocalCache = async (z: number, x: number, y: number): Promise<boolean> => {
  try {
    // Per app su PenDrive, controlla file locali
    const localPath = `./cache/tiles/${z}/${x}/${y}.png`;
    const response = await fetch(localPath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// Fallback per cache locale quando non c'è rete
export const getLocalTileUrl = (z: number, x: number, y: number): string => {
  return `./cache/tiles/${z}/${x}/${y}.png`;
};
```

### Sistema Ibrido Cache:
1. **Prima priorità:** Mappe CM93 locali
2. **Seconda priorità:** Cache tiles locali  
3. **Terza priorità:** Download online (se disponibile)
4. **Fallback:** Tile vuota/errore

## 📈 Ottimizzazione Performance

### Precaricamento Intelligente:
- Cache tile adiacenti durante navigazione
- Priorità aree visitate frequentemente
- Cleanup automatico tile vecchie

### Formato Ottimizzato:
- PNG ottimizzate con pngquant
- WebP per browser compatibili
- Compressione adattiva per zoom level

## 🚀 Deployment PenDrive

### File di Configurazione (.env.local):
```bash
# Configurazione per PenDrive
VITE_APP_MODE=offline
VITE_CACHE_ENABLED=true
VITE_CM93_ENABLED=true
VITE_CACHE_MAX_SIZE=1000
VITE_CACHE_CLEANUP_THRESHOLD=0.8
```

### Service Worker Personalizzato:
```javascript
// Intercetta richieste tile e usa cache locale
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/tiles/')) {
    event.respondWith(
      // Prima prova cache locale
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .catch(() => {
          // Fallback a tile locale o CM93
          return fetch(`./cache${new URL(event.request.url).pathname}`)
            .catch(() => fetch('./assets/empty-tile.png'));
        })
    );
  }
});
```

## 📋 Checklist Pre-Deployment

- [ ] Build applicazione completato
- [ ] Mappe CM93 copiate in /charts/
- [ ] Cache tiles generate in /cache/
- [ ] Manifest files aggiornati
- [ ] Script utilities inclusi
- [ ] Test funzionamento offline
- [ ] Verifica spazio disponibile PenDrive
- [ ] Backup configurazione utente