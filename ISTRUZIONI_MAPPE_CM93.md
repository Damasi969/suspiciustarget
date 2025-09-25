# Configurazione Mappe CM93 per PenDrive

## Struttura Standard delle Cartelle

### Posizione delle Mappe:
```
NauticalApp/charts/[NOME_REGIONE]/[ZOOM]/[X]/[Y].png
```

### Regioni Preconfigurate:

#### 1. **Mediterraneo** (`charts/mediterranean/`)
- **Bounds:** Lat: 30°-46°, Lng: -6°-36°
- **Zoom levels:** 4, 5, 6, 7, 8, 9, 10, 11, 12
- **Coverage:** Tutto il Mar Mediterraneo

#### 2. **Adriatico** (`charts/adriatic/`)
- **Bounds:** Lat: 39°-46°, Lng: 12°-20°  
- **Zoom levels:** 6, 7, 8, 9, 10, 11, 12, 13, 14
- **Coverage:** Mare Adriatico con dettaglio alto

## Come Aggiungere Nuove Regioni

### 1. Creare la Struttura Cartelle
```bash
mkdir -p charts/[NOME_REGIONE]
mkdir -p charts/[NOME_REGIONE]/{6,7,8,9,10,11,12}
```

### 2. Aggiungere la Configurazione
Nel file `src/utils/cm93Charts.ts`, aggiungere:

```javascript
{
  id: 'nome_regione',
  name: 'Nome Visualizzato',
  bounds: {
    north: 45.0,    // Latitudine Nord
    south: 35.0,    // Latitudine Sud  
    east: 18.0,     // Longitudine Est
    west: 10.0      // Longitudine Ovest
  },
  zoomLevels: [6, 7, 8, 9, 10, 11, 12],
  basePath: '/charts/nome_regione'
}
```

### 3. Coordinate delle Tile

Per calcolare le coordinate X,Y delle tile da un punto lat/lng:

```javascript
// Zoom level Z, latitudine LAT, longitudine LNG
const x = Math.floor((LNG + 180) / 360 * Math.pow(2, Z));
const y = Math.floor((1 - Math.log(Math.tan(LAT * Math.PI / 180) + 1 / Math.cos(LAT * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, Z));
```

### 4. Esempi di Regioni Aggiuntive

#### Tirreno:
```javascript
{
  id: 'tirreno',
  name: 'Mar Tirreno',
  bounds: { north: 44.0, south: 36.0, east: 15.0, west: 7.0 },
  zoomLevels: [6, 7, 8, 9, 10, 11, 12, 13],
  basePath: '/charts/tirreno'
}
```

#### Ionio:
```javascript
{
  id: 'ionio', 
  name: 'Mar Ionio',
  bounds: { north: 41.0, south: 35.0, east: 21.0, west: 14.0 },
  zoomLevels: [6, 7, 8, 9, 10, 11, 12],
  basePath: '/charts/ionio'
}
```

## Formato File e Requisiti

### Formato Immagini:
- **Tipo:** PNG
- **Dimensioni:** 256x256 pixel
- **Trasparenza:** Supportata per aree senza dati
- **Compressione:** Ottimizzata per ridurre dimensioni

### Nomenclatura File:
- **Rigorosa:** `[Y].png` (dove Y è la coordinata calcolata)
- **Case sensitive:** Usare sempre minuscolo
- **No spazi:** Solo numeri e punto

### Test Disponibilità:
L'app testa automaticamente se una carta è disponibile cercando:
`charts/[REGIONE]/[PRIMO_ZOOM]/0/0.png`

## Strumenti per Conversione

### Da GRIB/RINEX a PNG:
```bash
# Esempio con GDAL
gdal_translate -of PNG -outsize 256 256 input.grib output.png
```

### Batch Processing:
```bash
# Script per processare multiple carte
for region in mediterranean adriatic tirreno; do
  mkdir -p charts/$region/{6,7,8,9,10,11,12}
done
```

## Ottimizzazione Spazio

### Compressione PNG:
```bash
# Ottimizza tutte le PNG
find charts/ -name "*.png" -exec pngquant --quality=65-80 {} \;
```

### Solo Zoom Necessari:
- **Navigazione:** Zoom 6-10
- **Dettaglio Porti:** Zoom 11-14
- **Vista Generale:** Zoom 4-6