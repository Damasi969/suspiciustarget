/**
 * Utility per la gestione delle carte nautiche CM93 offline
 */

export interface CM93Chart {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoomLevels: number[];
  basePath: string;
}

/**
 * Configurazione delle carte CM93 disponibili
 */
export const availableCharts: CM93Chart[] = [
  {
    id: 'mediterranean',
    name: 'Mediterraneo',
    bounds: {
      north: 46.0,
      south: 30.0,
      east: 36.0,
      west: -6.0
    },
    zoomLevels: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    basePath: '/charts/mediterranean'
  },
  {
    id: 'adriatic',
    name: 'Mare Adriatico',
    bounds: {
      north: 46.0,
      south: 39.0,
      east: 20.0,
      west: 12.0
    },
    zoomLevels: [6, 7, 8, 9, 10, 11, 12, 13, 14],
    basePath: '/charts/adriatic'
  }
];

/**
 * Trova la carta migliore per le coordinate date
 */
export const findBestChart = (lat: number, lng: number, zoom: number): CM93Chart | null => {
  for (const chart of availableCharts) {
    const { bounds, zoomLevels } = chart;
    
    // Controlla se le coordinate sono dentro i bounds
    if (lat >= bounds.south && lat <= bounds.north && 
        lng >= bounds.west && lng <= bounds.east &&
        zoomLevels.includes(zoom)) {
      return chart;
    }
  }
  
  return null;
};

/**
 * Genera URL per tile CM93 locale
 */
export const getCM93TileUrl = (chart: CM93Chart, z: number, x: number, y: number): string => {
  return `${chart.basePath}/${z}/${x}/${y}.png`;
};

/**
 * Controlla se una carta CM93 è disponibile localmente
 */
export const isChartAvailable = async (chart: CM93Chart): Promise<boolean> => {
  try {
    // Testa se esiste almeno una tile di base
    const testUrl = getCM93TileUrl(chart, chart.zoomLevels[0], 0, 0);
    const response = await fetch(testUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Crea un layer Leaflet per carte CM93
 */
export const createCM93Layer = (chart: CM93Chart) => {
  const L = require('leaflet');
  
  return L.tileLayer(`${chart.basePath}/{z}/{x}/{y}.png`, {
    attribution: `&copy; Carte nautiche CM93 - ${chart.name}`,
    bounds: [
      [chart.bounds.south, chart.bounds.west],
      [chart.bounds.north, chart.bounds.east]
    ],
    minZoom: Math.min(...chart.zoomLevels),
    maxZoom: Math.max(...chart.zoomLevels),
    errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Tile trasparente per errori
    className: 'cm93-tiles'
  });
};