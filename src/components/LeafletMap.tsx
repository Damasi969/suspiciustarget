import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Waypoint, Target, Coordinates, MeasurementResult } from '@/types/nautical';
import { calculateDistance, calculateBearing, calculateTargetPosition } from '@/utils/coordinates';
import { WaypointContextMenu } from './WaypointContextMenu';
import { TargetContextMenu } from './TargetContextMenu';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Wifi, WifiOff, Trash2 } from 'lucide-react';
import { checkNetworkStatus, NetworkStatus, checkCacheForZoom } from '@/utils/networkDetection';
import { findBestChart, createCM93Layer, isChartAvailable, availableCharts } from '@/utils/cm93Charts';

// Fix per icone Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});
interface LeafletMapProps {
  waypoints: Waypoint[];
  targets: Target[];
  onWaypointUpdate: (waypoint: Waypoint) => void;
  onWaypointDelete: (waypointId: string) => void;
  onTargetUpdate: (target: Target) => void;
  onTargetDelete: (targetId: string) => void;
  onAddWaypoint?: (coordinates: Coordinates) => void;
  onAddTarget?: (coordinates: Coordinates) => void;
  measurementMode: boolean;
  measurementEditMode?: boolean;
  measurementResult?: MeasurementResult | null;
  onMeasurementResult?: (result: MeasurementResult) => void;
  onManualToggleMeasurement?: () => void;
  onClearMeasurement?: () => void;
  sarLayers: Record<string, boolean>;
}
export interface LeafletMapRef {
  centerOnCoordinates: (coordinates: Coordinates) => void;
  clearMeasurement: () => void;
}
export const LeafletMap = forwardRef<LeafletMapRef, LeafletMapProps>(({
  waypoints,
  targets,
  onWaypointUpdate,
  onWaypointDelete,
  onTargetUpdate,
  onTargetDelete,
  onAddWaypoint,
  onAddTarget,
  measurementMode,
  measurementEditMode = false,
  measurementResult,
  onMeasurementResult,
  onManualToggleMeasurement,
  onClearMeasurement,
  sarLayers
}, ref) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const tracksRef = useRef<Map<string, L.Polyline[]>>(new Map());
  const sarLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const [contextMenu, setContextMenu] = useState<{
    type: 'waypoint' | 'target' | 'empty';
    item?: Waypoint | Target;
    x: number;
    y: number;
    coordinates?: Coordinates;
  } | null>(null);
  const [measurementPoints, setMeasurementPoints] = useState<Coordinates[]>([]);
  const [measurementMarkers, setMeasurementMarkers] = useState<L.CircleMarker[]>([]);
  const [measurementLine, setMeasurementLine] = useState<L.Polyline | null>(null);
  const [measurementCompleted, setMeasurementCompleted] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ isOnline: true, canLoadTiles: true });
  const [currentTileLayer, setCurrentTileLayer] = useState<L.TileLayer | null>(null);
  const [measurementPopup, setMeasurementPopup] = useState<L.Popup | null>(null);
  useImperativeHandle(ref, () => ({
    centerOnCoordinates: (coordinates: Coordinates) => {
      if (leafletMapRef.current) {
        leafletMapRef.current.setView([coordinates.lat, coordinates.lng], leafletMapRef.current.getZoom());
      }
    },
    clearMeasurement: () => {
      if (leafletMapRef.current) {
        measurementMarkers.forEach(marker => leafletMapRef.current!.removeLayer(marker));
        if (measurementLine) {
          leafletMapRef.current!.removeLayer(measurementLine);
          setMeasurementLine(null);
        }
        if (measurementPopup) {
          leafletMapRef.current!.removeLayer(measurementPopup);
          setMeasurementPopup(null);
        }
        setMeasurementMarkers([]);
        setMeasurementPoints([]);
        setMeasurementCompleted(false);
      }
    }
  }), [measurementMarkers, measurementLine]);

  // Inizializza mappa Leaflet
  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, {
      center: [42.0, 12.0],
      zoom: 6,
      zoomControl: true,
      attributionControl: true
    });

    leafletMapRef.current = map;

  // Inizializza con controllo rete
    initializeTileLayer(map);

    return () => {
      map.remove();
    };
  }, []);

  // Funzione per inizializzare il layer delle tile
  const initializeTileLayer = async (map: L.Map) => {
    await updateTileLayer(map);
  };

  // Funzione per aggiornare il layer delle tile
  const updateTileLayer = async (map: L.Map, status?: NetworkStatus) => {
    // Rimuovi layer esistente
    if (currentTileLayer) {
      map.removeLayer(currentTileLayer);
    }

    const center = map.getCenter();
    const zoom = Math.round(map.getZoom());
    let newLayer: L.TileLayer;
    let layerSource = 'unknown';

    // Passo 1: Controlla se ci sono dati nella cache per questo zoom level
    const hasCachedData = await checkCacheForZoom(zoom, center.lat, center.lng);
    
    if (hasCachedData) {
      // Usa tile online con cache
      newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      layerSource = 'cached';
    } else {
      // Passo 2: Non ci sono dati cached, controlla connessione di rete
      const networkStatus = status || await checkNetworkStatus();
      
      if (networkStatus.canLoadTiles) {
        // La rete è disponibile, usa tile online (e aggiorna cache automaticamente)
        newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
        layerSource = 'online';
      } else {
        // Passo 3: Rete non disponibile, usa carte CM93
        const bestChart = findBestChart(center.lat, center.lng, zoom);
        
        if (bestChart && await isChartAvailable(bestChart)) {
          newLayer = createCM93Layer(bestChart);
          layerSource = 'cm93';
        } else {
          // Fallback: prova la prima carta disponibile
          let fallbackChart = null;
          for (const chart of availableCharts) {
            if (await isChartAvailable(chart)) {
              fallbackChart = chart;
              break;
            }
          }
          
          if (fallbackChart) {
            newLayer = createCM93Layer(fallbackChart);
            layerSource = 'cm93-fallback';
          } else {
            // Ultimo fallback: tile vuoto con messaggio
            newLayer = L.tileLayer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', {
              attribution: 'Modalità offline - Nessuna carta disponibile'
            });
            layerSource = 'offline';
          }
        }
      }
    }

    newLayer.addTo(map);
    setCurrentTileLayer(newLayer);

    // Aggiorna status in base alla sorgente
    const updatedStatus = {
      isOnline: layerSource === 'online',
      canLoadTiles: layerSource === 'online' || layerSource === 'cached'
    };
    setNetworkStatus(updatedStatus);
  };

  // Monitoraggio stato rete e zoom
  useEffect(() => {
    if (!leafletMapRef.current) return;

    const map = leafletMapRef.current;
    let interval: NodeJS.Timeout;

    const checkAndUpdate = async () => {
      await updateTileLayer(map);
    };

    // Controlla ogni 30 secondi
    interval = setInterval(checkAndUpdate, 30000);

    // Event listeners per cambiamenti immediati
    const handleOnline = () => checkAndUpdate();
    const handleOffline = () => checkAndUpdate();
    
    // Event listener per cambio zoom
    const handleZoomEnd = () => checkAndUpdate();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    map.on('zoomend', handleZoomEnd);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      map.off('zoomend', handleZoomEnd);
    };
  }, []);

  // Indicatore stato basato su currentTileLayer
  const getNetworkIndicator = () => {
    if (!currentTileLayer) return { icon: WifiOff, text: 'Caricamento...', color: 'text-yellow-500' };
    
    const attribution = currentTileLayer.options.attribution || '';
    
    if (attribution.includes('OpenStreetMap')) {
      return { icon: Wifi, text: 'Online', color: 'text-green-500' };
    } else if (attribution.includes('CM93')) {
      return { icon: WifiOff, text: 'Offline - Carte CM93', color: 'text-blue-500' };
    } else {
      return { icon: WifiOff, text: 'Offline', color: 'text-orange-500' };
    }
  };

  // Gestione layer SAR
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Definisci colori unici per ogni layer SAR
    const layerColors: Record<string, string> = {
      'Italia SAR': '#ffffff',
      'Malta SAR': '#dda0dd',
      'Tunisia SAR': '#44ff44',
      'Libia SAR': '#ff4444',
      'Grecia SAR': '#ffff00',
      'Frontex M1': '#44ffff',
      'Frontex M2': '#44ffff',
      'Frontex M3': '#44ffff',
      'Frontex L1': '#44ffff',
      'Frontex L2': '#44ffff',
      'Frontex L3': '#44ffff',
      'Frontex L4': '#44ffff',
    };

    // Coordinate dei poligoni SAR
    const layerPolygons: Record<string, Coordinates[]> = {
      'Italia SAR': [
        { lat: 36.50, lng: 11.50 },
        { lat: 35.25, lng: 12.23 },
        { lat: 35.25, lng: 12.67 },
        { lat: 36.5, lng: 14.08 },
        { lat: 37.11, lng: 14.08 },
        { lat: 36.5, lng: 14.08 },
        { lat: 36.0, lng: 16.00 },
        { lat: 36.0, lng: 19.00 },
        { lat: 37.75, lng: 15.55 },
        { lat: 38.00, lng: 15.55 },
        { lat: 38.23, lng: 15.63 },
        { lat: 38.27, lng: 15.67 },
        { lat: 38.65, lng: 15.48 },
        { lat: 38.67, lng: 15.52 },
        { lat: 39.02, lng: 15.58 },
        { lat: 39.02, lng: 14.82 },
        { lat: 39.2, lng: 14.06 },
        { lat: 38.01, lng: 14.06 },
        { lat: 39.2, lng: 14.06 },
        { lat: 39.02, lng: 14.82 },
        { lat: 39.02, lng: 15.58 },
        { lat: 39.83, lng: 15.50 },
        { lat: 39.0, lng: 19.00 },
        { lat: 36.0, lng: 19.00 },
        { lat: 37.75, lng: 15.55 },
        { lat: 38.00, lng: 15.55 },
        { lat: 38.23, lng: 15.63 },
        { lat: 38.27, lng: 15.67 },
        { lat: 38.65, lng: 15.48 },
        { lat: 38.67, lng: 15.52 },
        { lat: 39.02, lng: 15.58 },
        { lat: 39.02, lng: 14.82 },
        { lat: 39.2, lng: 14.06 },
        { lat: 38.01, lng: 14.06 }
      ],
      'Malta SAR': [
        { lat: 36.50, lng: 11.50 },
        { lat: 36.50, lng: 19.00 },
        { lat: 34.33, lng: 23.58 },
        { lat: 34.33, lng: 11.50 },
        { lat: 36.50, lng: 11.50 }
      ],
      'Tunisia SAR': [
        { lat: 33.16, lng: 11.55 },
        { lat: 33.81, lng: 11.95 },
        { lat: 34.33, lng: 11.95 },
        { lat: 34.33, lng: 11.50 },
        { lat: 37.5, lng: 11.50 },
        { lat: 38.0, lng: 10.21 },
        { lat: 38.53, lng: 9.05 },
        { lat: 38.53, lng: 8.01 },
        { lat: 36.93, lng: 8.63 },
        { lat: 33.16, lng: 11.55 }
      ],
      'Libia SAR': [
        { lat: 33.16, lng: 11.55 },
        { lat: 33.81, lng: 11.95 },
        { lat: 34.33, lng: 11.95 },
        { lat: 34.33, lng: 23.58 },
        { lat: 33.98, lng: 24.16 },
        { lat: 32.00, lng: 25.84 },
        { lat: 31.55, lng: 25.17 },
        { lat: 33.16, lng: 11.55 }
      ],
      'Grecia SAR': [
        { lat: 39.0, lng: 19.00 },
        { lat: 39.0, lng: 26.00 },
        { lat: 35.0, lng: 26.00 },
        { lat: 35.0, lng: 23.00 },
        { lat: 36.84, lng: 20.0 },
        { lat: 37.50, lng: 19.90 },
        { lat: 39.0, lng: 19.00 }
      ],
      'Frontex M1': [
        { lat: 37.5, lng: 15.083333 },      // 37° 30' 0.000" N, 15° 5' 0.000" E
        { lat: 37.5, lng: 19.9 },           // 37° 30' 0.000" N, 19° 54' 0.000" E
        { lat: 36.0, lng: 20.844444 },      // 36° 0' 0.000" N, 20° 50' 40.00" E
        { lat: 36.0, lng: 16.0 },           // 36° 0' 0.000" N, 16° 0' 0.00" E
        { lat: 36.239722, lng: 15.120278 }, // 36° 14' 23.0" N, 15° 7' 13.00" E
        { lat: 36.648889, lng: 15.078889 }, // 36° 38' 56.0" N, 15° 4' 44.00" E
        { lat: 37.5, lng: 15.083333 }       // Chiude il poligono
      ],
      'Frontex M2': [
        { lat: 36.648889, lng: 15.078889 }, // 36° 38' 56.0" N, 15° 4' 44.00" E
        { lat: 36.239722, lng: 15.120278 }, // 36° 14' 23.0" N, 15° 7' 13.00" E
        { lat: 36.5, lng: 14.133333 },      // 36° 30' 0.000" N, 14° 8' 0.000" E
        { lat: 35.25, lng: 12.666667 },     // 35° 15' 0.000" N, 12° 40' 0.000" E
        { lat: 35.25, lng: 12.233333 },     // 35° 15' 0.000" N, 12° 14' 0.000" E
        { lat: 36.5, lng: 11.5 },           // 36° 30' 0.000" N, 11° 30' 0.000" E
        { lat: 37.5, lng: 11.5 },           // 37° 30' 0.000" N, 11° 30' 0.000" E
        { lat: 38.558889, lng: 11.5 },      // 38° 33' 32.000" N, 11° 30' 0.000" E
        { lat: 38.189167, lng: 12.730278 }, // 39° 11' 21.000" N, 12° 43' 49.000" E
        { lat: 36.648889, lng: 15.078889 }  // Chiude il poligono
      ],
      'Frontex M3': [
        { lat: 39.883333, lng: 8.433333 },  // 39° 53' 0.000" N, 8° 26' 0.000" E
        { lat: 39.883333, lng: 7.5 },       // 39° 53' 0.000" N, 7° 30' 0.000" E
        { lat: 38.0, lng: 7.5 },            // 38° 00' 0.000" N, 7° 30' 0.000" E
        { lat: 38.0, lng: 10.35 },          // 38° 00' 0.000" N, 10° 21' 0.000" E
        { lat: 37.5, lng: 11.5 },           // 37° 30' 0.000" N, 11° 30' 0.000" E
        { lat: 38.558889, lng: 11.5 },      // 38° 33' 32.000" N, 11° 30' 0.000" E
        { lat: 39.094444, lng: 9.523611 },  // 39° 05' 40.000" N, 9° 31' 25.000" E
        { lat: 39.883333, lng: 8.433333 }   // Chiude il poligono
      ],
      'Frontex L1': [
        { lat: 42.466667, lng: 14.216667 },    // 42° 28' 0.000" N, 14° 13' 0.000" E
        { lat: 43.116667, lng: 15.166667 },    // 43° 07' 0.000" N, 15° 10' 0.000" E
        { lat: 43.101742, lng: 15.186681 },    // 43° 06' 6.27" N, 015° 11' 12.05" E
        { lat: 43.076669, lng: 15.188053 },    // 43° 04' 36.01" N, 015° 11' 16.99" E
        { lat: 43.028503, lng: 15.199039 },    // 43° 01' 42.61" N, 015° 11' 56.54" E
        { lat: 42.968239, lng: 15.242986 },    // 42° 58' 5.66" N, 015° 14' 34.75" E
        { lat: 42.927025, lng: 15.306158 },    // 42° 55' 37.29" N, 015° 18' 22.17" E
        { lat: 42.898864, lng: 15.399542 },    // 42° 53' 55.91" N, 015° 23' 58.35" E
        { lat: 42.892828, lng: 15.495672 },    // 42° 53' 34.18" N, 015° 29' 44.42" E
        { lat: 42.862636, lng: 15.539617 },    // 42° 51' 45.49" N, 015° 32' 22.62" E
        { lat: 42.837469, lng: 15.600042 },    // 42° 50' 14.88" N, 015° 36' 0.15" E
        { lat: 42.821219, lng: 15.650792 },    // 42° 49' 31.37" N, 015° 39' 22.85" E
        { lat: 42.574322, lng: 16.067836 },    // 42° 34' 33.96" N, 016° 04' 40.61" E
        { lat: 42.507294, lng: 16.020267 },    // 42° 30' 26.26" N, 016° 01' 12.96" E
        { lat: 42.449564, lng: 15.987306 },    // 42° 26' 58.43" N, 015° 59' 14.31" E
        { lat: 42.369461, lng: 15.970831 },    // 42° 22' 10.06" N, 015° 58' 14.99" E
        { lat: 42.324061, lng: 15.987306 },    // 42° 19' 25.63" N, 015° 59' 14.31" E
        { lat: 42.278111, lng: 16.018672 },    // 42° 16' 41.08" N, 016° 01' 08.02" E
        { lat: 42.224422, lng: 16.082067 },    // 42° 13' 30.8" N, 016° 04' 55.44" E
        { lat: 42.204875, lng: 16.153478 },    // 42° 12' 17.56" N, 016° 09' 12.52" E
        { lat: 42.178425, lng: 16.275675 },    // 42° 10' 42.33" N, 016° 16' 32.52" E
        { lat: 42.177411, lng: 16.393561 },    // 42° 10' 38.67" N, 016° 23' 27.81" E
        { lat: 42.202844, lng: 16.470400 },    // 42° 12' 10.24" N, 016° 28' 14.55" E
        { lat: 42.266667, lng: 16.616667 },    // 42° 16' 00.00" N, 016° 37' 00.00" E
        { lat: 42.093333, lng: 16.893611 },    // 42° 5' 36.00" N, 016° 33' 37.00" E
        { lat: 41.950000, lng: 16.016667 },    // 41° 57' 0.00" N, 016° 1' 0.00" E
        { lat: 42.466667, lng: 14.216667 }     // Chiude il poligono
      ],
      'Frontex L2': [
        { lat: 41.950000, lng: 16.016667 },    // 41° 57' 0.000" N, 16° 1' 0.000" E
        { lat: 42.093333, lng: 16.893611 },    // 42° 5' 36.000" N, 16° 53' 37.000" E
        { lat: 40.750000, lng: 19.000000 },    // 40° 45' 0.000" N, 19° 0' 0.000" E
        { lat: 41.000000, lng: 17.211667 },    // 41° 0' 0.000" N, 17° 12' 42.000" E
        { lat: 41.950000, lng: 16.016667 }     // Chiude il poligono
      ],
      'Frontex L3': [
        { lat: 41.000000, lng: 17.211667 },    // 41° 0' 0.000" N, 17° 12' 42.000" E
        { lat: 40.750000, lng: 19.000000 },    // 40° 45' 0.000" N, 19° 0' 0.000" E
        { lat: 39.500000, lng: 19.000000 },    // 39° 30' 0.000" N, 19° 0' 0.000" E
        { lat: 39.500000, lng: 16.948611 },    // 39° 30' 0.000" N, 16° 56' 55.000" E
        { lat: 41.000000, lng: 17.211667 }     // Chiude il poligono
      ],
      'Frontex L4': [
        { lat: 39.500000, lng: 16.948611 },    // 39° 30' 0.000" N, 16° 56' 55.000" E
        { lat: 39.500000, lng: 19.000000 },    // 39° 30' 0.000" N, 19° 00' 0.000" E
        { lat: 39.000000, lng: 18.983333 },    // 39° 00' 0.000" N, 18° 59' 0.000" E
        { lat: 37.500000, lng: 19.900000 },    // 37° 30' 0.000" N, 19° 54' 0.000" E
        { lat: 37.500000, lng: 15.083333 },    // 37° 30' 0.000" N, 15° 5' 0.000" E
        { lat: 38.116667, lng: 15.516667 },    // 38° 07' 0.000" N, 15° 31' 0.000" E
        { lat: 38.122194, lng: 15.633333 },    // 38° 07' 19.000" N, 15° 38' 0.000" E
        { lat: 39.500000, lng: 16.948611 }     // Chiude il poligono
      ],
    };

    // Gestisci visibilità layer
    Object.entries(sarLayers).forEach(([layerName, isEnabled]) => {
      const existingLine = sarLinesRef.current.get(layerName);

      if (isEnabled && !existingLine && layerPolygons[layerName].length > 0) {
        // Crea polilinea se abilitato e ha coordinate
        let coordinates = layerPolygons[layerName].map(coord => [coord.lat, coord.lng] as [number, number]);
        const color = layerColors[layerName] || '#666666';
        
        // Per Malta SAR, crea polilinea chiusa senza colore di riempimento
        if (layerName === 'Malta SAR') {
          // Assicurati che la polilinea sia chiusa aggiungendo il primo punto alla fine se necessario
          const firstPoint = coordinates[0];
          const lastPoint = coordinates[coordinates.length - 1];
          if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            coordinates = [...coordinates, firstPoint];
          }
        }
        
        const polyline = L.polyline(coordinates, {
          color: color,
          weight: 2,
          opacity: 0.8
        }).addTo(map);

        // Calcola il centro per l'etichetta usando la media delle coordinate
        if (coordinates.length > 0) {
          const centerLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
          const centerLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
          
          L.marker([centerLat, centerLng], {
            icon: L.divIcon({
              className: 'sar-label',
              html: `<div style="background: ${color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; font-weight: bold; text-align: center; white-space: nowrap;">${layerName}</div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            })
          }).addTo(map);
        }

        sarLinesRef.current.set(layerName, polyline);
      } else if (!isEnabled && existingLine) {
        // Rimuovi polilinea se disabilitato
        map.removeLayer(existingLine);
        sarLinesRef.current.delete(layerName);
        
        // Rimuovi anche l'etichetta
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker && layer.options.icon instanceof L.DivIcon) {
            const icon = layer.options.icon as L.DivIcon;
            if (icon.options.html && typeof icon.options.html === 'string' && icon.options.html.includes(layerName)) {
              map.removeLayer(layer);
            }
          }
        });
      }
    });
  }, [sarLayers]);

    // Gestione eventi mappa (separato per permettere aggiornamento quando measurementMode cambia)
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Funzione helper per gestire i click di misurazione
    const handleMeasurementClick = (coordinates: Coordinates) => {
      if (measurementEditMode && measurementResult) {
        // Modalità edit: ripristina i punti esistenti se non sono ancora stati settati
        if (measurementPoints.length === 0) {
          const startPoint = measurementResult.startPoint;
          const endPoint = measurementResult.endPoint;
          
          // Crea i marker per i punti esistenti
          const startMarker = L.circleMarker([startPoint.lat, startPoint.lng], {
            radius: 5,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.8
          }).addTo(map);
          
          const endMarker = L.circleMarker([endPoint.lat, endPoint.lng], {
            radius: 5,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.8
          }).addTo(map);
          
          // Crea la linea esistente
          const line = L.polyline([
            [startPoint.lat, startPoint.lng],
            [endPoint.lat, endPoint.lng]
          ], {
            color: 'red',
            weight: 3,
            opacity: 0.8
          }).addTo(map);
          
          setMeasurementPoints([startPoint, endPoint]);
          setMeasurementMarkers([startMarker, endMarker]);
          setMeasurementLine(line);
          return;
        }
        
        // Se abbiamo già i punti, trova il più vicino e spostalo
        if (measurementPoints.length === 2) {
          const startPoint = measurementPoints[0];
          const endPoint = measurementPoints[1];
          
          // Calcola le distanze dal click ai due punti
          const distanceToStart = Math.sqrt(
            Math.pow(coordinates.lat - startPoint.lat, 2) + 
            Math.pow(coordinates.lng - startPoint.lng, 2)
          );
          const distanceToEnd = Math.sqrt(
            Math.pow(coordinates.lat - endPoint.lat, 2) + 
            Math.pow(coordinates.lng - endPoint.lng, 2)
          );
          
          // Determina quale punto spostare
          const moveStartPoint = distanceToStart < distanceToEnd;
          const newPoints = moveStartPoint 
            ? [coordinates, endPoint]
            : [startPoint, coordinates];
          
          // Rimuovi marker e linea esistenti
          measurementMarkers.forEach(marker => map.removeLayer(marker));
          if (measurementLine) map.removeLayer(measurementLine);
          
          // Crea nuovi marker
          const newMarkers = newPoints.map(point => 
            L.circleMarker([point.lat, point.lng], {
              radius: 5,
              color: 'red',
              fillColor: 'red',
              fillOpacity: 0.8
            }).addTo(map)
          );
          
          // Crea nuova linea
          const newLine = L.polyline([
            [newPoints[0].lat, newPoints[0].lng],
            [newPoints[1].lat, newPoints[1].lng]
          ], {
            color: 'red',
            weight: 3,
            opacity: 0.8
          }).addTo(map);
          
          setMeasurementPoints(newPoints);
          setMeasurementMarkers(newMarkers);
          setMeasurementLine(newLine);
          
          // Calcola e aggiorna il risultato
          const distance = calculateDistance(newPoints[0], newPoints[1]);
          const bearing = calculateBearing(newPoints[0], newPoints[1]);
          
          const result: MeasurementResult = {
            distance,
            bearing,
            startPoint: newPoints[0],
            endPoint: newPoints[1]
          };
          
          onMeasurementResult?.(result);
          return;
        }
      } else {
        // Modalità normale: crea nuova misurazione
        if (measurementPoints.length === 0) {
          setMeasurementPoints([coordinates]);
          const marker = L.circleMarker([coordinates.lat, coordinates.lng], {
            radius: 5,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.8
          }).addTo(map);
          setMeasurementMarkers([marker]);
        } else if (measurementPoints.length === 1) {
          const startPoint = measurementPoints[0];
          const distance = calculateDistance(startPoint, coordinates);
          const bearing = calculateBearing(startPoint, coordinates);
          
          // Aggiungi secondo marker
          const secondMarker = L.circleMarker([coordinates.lat, coordinates.lng], {
            radius: 5,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.8
          }).addTo(map);
          
          // Aggiungi linea rossa tra i due punti
          const line = L.polyline([
            [startPoint.lat, startPoint.lng],
            [coordinates.lat, coordinates.lng]
          ], {
            color: 'red',
            weight: 3,
            opacity: 0.8
          }).addTo(map);
          
          setMeasurementMarkers(prev => [...prev, secondMarker]);
          setMeasurementLine(line);
          setMeasurementCompleted(true);
          
          const result: MeasurementResult = {
            distance,
            bearing,
            startPoint,
            endPoint: coordinates
          };
          
          onMeasurementResult?.(result);
        }
      }
    };

    // Rimuovi event listener esistenti
    map.off('click');
    map.off('contextmenu');

    // Eventi mappa
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const coordinates = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      
      if (measurementMode) {
        handleMeasurementClick(coordinates);
      }
    };

    const handleContextMenu = (e: L.LeafletMouseEvent) => {
      if (measurementMode) return; // Disabilita context menu in modalità misurazione
      e.originalEvent.preventDefault();
      setContextMenu({
        type: 'empty',
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
        coordinates: {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }
      });
    };

    map.on('click', handleMapClick);
    map.on('contextmenu', handleContextMenu);

    // Salva la funzione per poterla usare nei marker
    (map as any).handleMeasurementClick = handleMeasurementClick;

    return () => {
      map.off('click', handleMapClick);
      map.off('contextmenu', handleContextMenu);
      delete (map as any).handleMeasurementClick;
    };
  }, [measurementMode, measurementEditMode, measurementResult, measurementPoints, measurementMarkers, onMeasurementResult]);

  // Effetto per pulire i marcatori di misurazione quando la modalità cambia
  useEffect(() => {
    if (!measurementMode && leafletMapRef.current && !measurementCompleted) {
      // Pulisci solo se la modalità è stata disattivata manualmente (non dopo completamento automatico)
      measurementMarkers.forEach(marker => leafletMapRef.current!.removeLayer(marker));
      if (measurementLine) {
        leafletMapRef.current!.removeLayer(measurementLine);
        setMeasurementLine(null);
      }
      setMeasurementMarkers([]);
      setMeasurementPoints([]);
      onManualToggleMeasurement?.();
    }
    
    // Se la modalità misurazione viene riattivata, pulisci la misurazione precedente
    if (measurementMode && measurementCompleted && leafletMapRef.current) {
      measurementMarkers.forEach(marker => leafletMapRef.current!.removeLayer(marker));
      if (measurementLine) {
        leafletMapRef.current!.removeLayer(measurementLine);
        setMeasurementLine(null);
      }
      setMeasurementMarkers([]);
      setMeasurementPoints([]);
      setMeasurementCompleted(false);
    }
  }, [measurementMode, measurementCompleted, onManualToggleMeasurement]);

  // Gestione popup misurazione
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Rimuovi popup esistente se necessario
    if (measurementPopup) {
      map.removeLayer(measurementPopup);
      setMeasurementPopup(null);
    }

    // Crea nuovo popup se c'è un risultato di misurazione e non siamo in modalità misurazione
    if (measurementResult && !measurementMode) {
      const centerLat = (measurementResult.startPoint.lat + measurementResult.endPoint.lat) / 2;
      const centerLng = (measurementResult.startPoint.lng + measurementResult.endPoint.lng) / 2;

      const popupContent = `
        <div style="
          background: #1f2937; 
          color: white; 
          padding: 10px; 
          border-radius: 6px; 
          font-family: system-ui, -apple-system, sans-serif;
          min-width: 180px;
          text-align: center;
        ">
          <div style="margin-bottom: 4px; font-size: 14px;">
            Distanza: <span style="font-weight: 600;">${measurementResult.distance.toFixed(2)} NM</span>
          </div>
          <div style="margin-bottom: 8px; font-size: 14px;">
            Rotta: <span style="font-weight: 600;">${measurementResult.bearing.toFixed(1)}°</span>
          </div>
          <button 
            id="clearMeasurementBtn"
            style="
              background: transparent; 
              color: #ef4444; 
              border: none; 
              padding: 4px; 
              border-radius: 4px; 
              cursor: pointer; 
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto;
              width: 24px;
              height: 24px;
              transition: color 0.2s ease;
            "
            onmouseover="this.style.color='#dc2626'"
            onmouseout="this.style.color='#ef4444'"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      const popup = L.popup({
        closeButton: false,
        autoClose: false,
        closeOnEscapeKey: false,
        closeOnClick: false,
        className: 'measurement-popup'
      })
        .setLatLng([centerLat, centerLng])
        .setContent(popupContent)
        .addTo(map);

      setMeasurementPopup(popup);

      // Aggiungi event listener al bottone dopo che il popup è stato aggiunto
      setTimeout(() => {
        const clearBtn = document.getElementById('clearMeasurementBtn');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            onClearMeasurement?.();
          });
        }
      }, 100);
    }
  }, [measurementResult, measurementMode, onClearMeasurement]);

  // Cleanup quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (measurementPopup && leafletMapRef.current) {
        leafletMapRef.current.removeLayer(measurementPopup);
      }
    };
  }, []);

  // Cleanup effetto per pulizia misurazione
  useEffect(() => {
    const cleanup = () => {
      if (leafletMapRef.current) {
        measurementMarkers.forEach(marker => leafletMapRef.current!.removeLayer(marker));
        if (measurementLine) {
          leafletMapRef.current!.removeLayer(measurementLine);
          setMeasurementLine(null);
        }
        if (measurementPopup) {
          leafletMapRef.current!.removeLayer(measurementPopup);
          setMeasurementPopup(null);
        }
        setMeasurementMarkers([]);
        setMeasurementPoints([]);
        setMeasurementCompleted(false);
      }
    };

    // Assegna la funzione di cleanup a window per uso interno se necessario
    (window as any).internalClearMeasurement = cleanup;

    return () => {
      delete (window as any).internalClearMeasurement;
    };
  }, [measurementMarkers, measurementLine, measurementPopup]);

  // Aggiorna waypoints
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Rimuovi marker esistenti per waypoints (compresi quelli delle coordinate precedenti)
    markersRef.current.forEach((marker, id) => {
      if (id.startsWith('waypoint_') || id.startsWith('waypoint_prev_')) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    // Aggiungi nuovi waypoint markers
    waypoints.forEach(waypoint => {
      // Aggiungi marker per le coordinate precedenti (storico) con trasparenza
      if (waypoint.previousCoordinates && waypoint.previousCoordinates.length > 0) {
        waypoint.previousCoordinates.forEach((prevCoord, index) => {
          const opacity = Math.max(0.2, 1 - (index + 1) * 0.1); // Opacità decrescente per le più vecchie
          const prevIcon = L.divIcon({
            className: 'custom-waypoint-marker-prev',
            html: `
              <div style="
                width: 16px;
                height: 16px;
                background-color: ${waypoint.color};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                opacity: ${opacity};
              "></div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          const prevMarker = L.marker([prevCoord.lat, prevCoord.lng], {
            icon: prevIcon
          }).bindPopup(`
              <div style="opacity: ${opacity};">
                <strong>${waypoint.name} - Storico</strong><br/>
                Lat: ${prevCoord.lat.toFixed(6)}°<br/>
                Lng: ${prevCoord.lng.toFixed(6)}°
              </div>
            `).addTo(map);
          markersRef.current.set(`waypoint_prev_${waypoint.id}_${index}`, prevMarker);
        });
      }

      const icon = L.divIcon({
        className: 'custom-waypoint-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background-color: ${waypoint.color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
          <div style="
            position: absolute;
            top: 25px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
            pointer-events: none;
          ">${waypoint.name}</div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      const marker = L.marker([waypoint.coordinates.lat, waypoint.coordinates.lng], {
        icon
      }).bindPopup(measurementMode ? null : `
          <div>
            <strong>${waypoint.name}</strong><br/>
            Lat: ${waypoint.coordinates.lat.toFixed(6)}°<br/>
            Lng: ${waypoint.coordinates.lng.toFixed(6)}°
          </div>
        `).on('click', e => {
        if (measurementMode) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
          const handleMeasurementClick = (leafletMapRef.current as any).handleMeasurementClick;
          if (handleMeasurementClick) {
            handleMeasurementClick(waypoint.coordinates);
          }
          return false;
        }
      }).on('contextmenu', e => {
        if (measurementMode) return; // Disabilita context menu in modalità misurazione
        e.originalEvent.preventDefault();
        setContextMenu({
          type: 'waypoint',
          item: waypoint,
          x: e.originalEvent.clientX,
          y: e.originalEvent.clientY
        });
      }).addTo(map);
      markersRef.current.set(`waypoint_${waypoint.id}`, marker);
    });
  }, [waypoints]);

  // Aggiorna targets con aggiornamento automatico ogni 5 minuti
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    const updateTargets = () => {
      // Rimuovi marker e tracce esistenti per targets (compresi quelli delle coordinate precedenti)
      markersRef.current.forEach((marker, id) => {
        if (id.startsWith('target_') || id.startsWith('target_prev_')) {
          map.removeLayer(marker);
          markersRef.current.delete(id);
        }
      });
      tracksRef.current.forEach(tracks => {
        tracks.forEach(track => map.removeLayer(track));
      });
      tracksRef.current.clear();

      // Aggiungi nuovi target markers e tracce
      targets.forEach(target => {
        // Aggiungi marker per le coordinate precedenti (storico) con trasparenza
        if (target.previousCoordinates && target.previousCoordinates.length > 0) {
          target.previousCoordinates.forEach((prevCoord, index) => {
            const opacity = Math.max(0.2, 1 - (index + 1) * 0.1); // Opacità decrescente per le più vecchie
            const prevIcon = L.divIcon({
              className: 'custom-target-marker-prev',
              html: `
                <div style="
                  width: 0;
                  height: 0;
                  border-left: 6px solid transparent;
                  border-right: 6px solid transparent;
                  border-bottom: 15px solid ${target.color};
                  position: relative;
                  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
                  opacity: ${opacity};
                "></div>
              `,
              iconSize: [12, 20],
              iconAnchor: [6, 20]
            });
            const prevMarker = L.marker([prevCoord.lat, prevCoord.lng], {
              icon: prevIcon
            }).bindPopup(`
                <div style="opacity: ${opacity};">
                  <strong>${target.name} - Storico</strong><br/>
                  Lat: ${prevCoord.lat.toFixed(6)}°<br/>
                  Lng: ${prevCoord.lng.toFixed(6)}°
                </div>
              `).addTo(map);
            markersRef.current.set(`target_prev_${target.id}_${index}`, prevMarker);
          });
        }

        const currentTime = new Date();
        const targetTime = new Date(target.timestamp);
        const hoursElapsed = (currentTime.getTime() - targetTime.getTime()) / (1000 * 60 * 60);
        let currentPosition = target.coordinates;
        if (hoursElapsed >= 0) {
          currentPosition = calculateTargetPosition(target.coordinates, target.course, target.speed, hoursElapsed);
        }

        // Calcola il bearing per l'allineamento sulla traccia
        let alignmentBearing = target.course;
        if (target.futureTrack && target.futureTrack.length > 1) {
          const nextPosition = target.futureTrack[1];
          alignmentBearing = calculateBearing(currentPosition, nextPosition);
        }

        // Icona target (triangolo lampeggiante)
        const icon = L.divIcon({
          className: 'custom-target-marker',
          html: `
            <div style="
              width: 0;
              height: 0;
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-bottom: 20px solid ${target.color};
              position: relative;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              transform: rotate(${alignmentBearing - 180}deg);
              animation: blink 2s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 25px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0,0,0,0.7);
              color: white;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: bold;
              white-space: nowrap;
              pointer-events: none;
            ">${target.name}</div>
            <style>
              @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
              }
            </style>
          `,
          iconSize: [16, 28],
          iconAnchor: [8, 28]
        });
        const marker = L.marker([currentPosition.lat, currentPosition.lng], {
          icon
        }).bindPopup(measurementMode ? null : `
            <div>
              <strong>${target.name}</strong><br/>
              Posizione corrente:<br/>
              Lat: ${currentPosition.lat.toFixed(6)}°<br/>
              Lng: ${currentPosition.lng.toFixed(6)}°<br/>
              Rotta: ${target.course}°<br/>
              Velocità: ${target.speed.toFixed(1)} kn
            </div>
          `).on('click', e => {
          if (measurementMode) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            const handleMeasurementClick = (leafletMapRef.current as any).handleMeasurementClick;
            if (handleMeasurementClick) {
              handleMeasurementClick(currentPosition);
            }
            return false;
          }
        }).on('contextmenu', e => {
          if (measurementMode) return;
          e.originalEvent.preventDefault();
          setContextMenu({
            type: 'target',
            item: target,
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY
          });
        }).addTo(map);
        markersRef.current.set(`target_${target.id}`, marker);

        // Marker per posizione iniziale del target
        const initialIcon = L.divIcon({
          className: 'initial-position-marker',
          html: `
            <div style="
              width: 8px;
              height: 8px;
              background-color: ${target.color};
              border: 1px solid white;
              border-radius: 50%;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [8, 8],
          iconAnchor: [4, 4]
        });
        const initialMarker = L.marker([target.coordinates.lat, target.coordinates.lng], {
          icon: initialIcon
        }).addTo(map);
        markersRef.current.set(`target_initial_${target.id}`, initialMarker);

        // Tracce
        const tracks: L.Polyline[] = [];

        // Traccia passata (nera) - da posizione iniziale a posizione corrente
        if (hoursElapsed >= 0) {
          const pastTrack = L.polyline([
            [target.coordinates.lat, target.coordinates.lng],
            [currentPosition.lat, currentPosition.lng]
          ], {
            color: '#000000',
            weight: 3,
            opacity: 0.8
          }).addTo(map);
          tracks.push(pastTrack);
        }

        // Traccia futura (colore del target) - da posizione corrente
        if (target.futureTrack && target.futureTrack.length > 1) {
          const futureTrack = L.polyline(target.futureTrack.map(p => [p.lat, p.lng]), {
            color: target.color,
            weight: 3,
            opacity: 0.7,
            dashArray: '10,5'
          }).addTo(map);
          
          // Aggiungi tooltip hover per ogni punto della traccia futura
          futureTrack.on('mousemove', (e: any) => {
            const latLng = e.latlng;
            const referenceTime = new Date(target.timestamp);
            
            // Trova il punto più vicino sulla traccia
            let closestDistance = Infinity;
            let closestIndex = 0;
            
            target.futureTrack.forEach((point, index) => {
              const distance = Math.sqrt(
                Math.pow(point.lat - latLng.lat, 2) + 
                Math.pow(point.lng - latLng.lng, 2)
              );
              if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
              }
            });
            
            // Calcola il tempo per questo punto (ogni punto rappresenta 0.5 ore = 30 minuti)
            const hoursFromStart = closestIndex * 0.5;
            const futureTime = new Date(referenceTime.getTime() + hoursFromStart * 60 * 60 * 1000);
            
            const point = target.futureTrack[closestIndex];
            
            L.popup()
              .setLatLng(latLng)
              .setContent(`
                <div>
                  <strong>${target.name}</strong><br/>
                  <strong>Posizione prevista:</strong><br/>
                  ${futureTime.toLocaleDateString('it-IT')} ${futureTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}<br/>
                  Lat: ${point.lat.toFixed(6)}°<br/>
                  Lng: ${point.lng.toFixed(6)}°
                </div>
              `)
              .openOn(map);
          });
          
          futureTrack.on('mouseout', () => {
            map.closePopup();
          });
          
          tracks.push(futureTrack);
        }
        tracksRef.current.set(target.id, tracks);
      });
    };

    // Aggiorna immediatamente
    updateTargets();

    // Imposta aggiornamento ogni 5 minuti
    const interval = setInterval(updateTargets, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [targets, measurementMode]);
  const handleZoomIn = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };
  const handleZoomOut = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };
  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const panAmount = 0.01 * Math.pow(2, 10 - zoom); // Adjust based on zoom level

    switch (direction) {
      case 'up':
        map.setView([center.lat + panAmount, center.lng]);
        break;
      case 'down':
        map.setView([center.lat - panAmount, center.lng]);
        break;
      case 'left':
        map.setView([center.lat, center.lng - panAmount]);
        break;
      case 'right':
        map.setView([center.lat, center.lng + panAmount]);
        break;
    }
  };
  return <div className="relative w-full h-full">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className="flex flex-col gap-1">
          
          
        </div>
        
        {/* Pan Controls */}
        <div className="grid grid-cols-3 gap-1 w-24">
          <div></div>
          
          <div></div>
          
          <div></div>
          
          <div></div>
          
          <div></div>
        </div>
      </div>

      {/* Indicatore modalità misurazione */}
      {measurementMode && <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium z-[1000]">
          Modalità Misurazione Attiva - Clicca due punti
        </div>}

      {/* Indicatore stato rete */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-sm">
        {(() => {
          const indicator = getNetworkIndicator();
          const IconComponent = indicator.icon;
          return (
            <>
              <IconComponent className={`h-4 w-4 ${indicator.color}`} />
              <span className="text-foreground">{indicator.text}</span>
            </>
          );
        })()}
      </div>

      {/* Mappa container */}
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* Menu contestuali */}
      {contextMenu && <>
          {contextMenu.type === 'waypoint' ? <WaypointContextMenu waypoint={contextMenu.item as Waypoint} x={contextMenu.x} y={contextMenu.y} onUpdate={onWaypointUpdate} onDelete={onWaypointDelete} onClose={() => setContextMenu(null)} /> : contextMenu.type === 'target' ? <TargetContextMenu target={contextMenu.item as Target} x={contextMenu.x} y={contextMenu.y} onUpdate={onTargetUpdate} onDelete={onTargetDelete} onClose={() => setContextMenu(null)} /> : <div className="fixed bg-card border border-border shadow-lg rounded-lg py-1 z-[2002]" style={{
        left: contextMenu.x,
        top: contextMenu.y
      }}>
              <button className="w-full px-4 py-2 text-sm text-foreground hover:bg-accent text-left" onClick={() => {
          if (contextMenu.coordinates) {
            onAddWaypoint?.(contextMenu.coordinates);
          }
          setContextMenu(null);
        }}>
                Aggiungi Waypoint
              </button>
              <button className="w-full px-4 py-2 text-sm text-foreground hover:bg-accent text-left" onClick={() => {
          if (contextMenu.coordinates) {
            onAddTarget?.(contextMenu.coordinates);
          }
          setContextMenu(null);
        }}>
                Aggiungi Target
              </button>
            </div>}
        </>}
      
      {/* Click outside to close context menu */}
      {contextMenu && <div className="fixed inset-0 z-[1000]" onClick={() => setContextMenu(null)} />}
    </div>;
});
LeafletMap.displayName = 'LeafletMap';