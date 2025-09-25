export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SexagesimalCoordinates {
  lat: {
    degrees: number;
    minutes: number;
    seconds: number;
    hemisphere: 'N' | 'S';
  };
  lng: {
    degrees: number;
    minutes: number;
    seconds: number;
    hemisphere: 'E' | 'W';
  };
}

export interface Waypoint {
  id: string;
  name: string;
  coordinates: Coordinates;
  color: string;
  previousCoordinates?: Coordinates[]; // Storico delle coordinate precedenti
  createdAt: string;
  updatedAt: string;
}

export interface Target {
  id: string;
  name: string;
  coordinates: Coordinates;
  course: number; // Rotta in gradi
  speed: number; // Velocità in nodi
  timestamp: string; // Data e ora di riferimento
  color: string;
  pastTrack: Coordinates[]; // Traccia passata (nero)
  futureTrack: Coordinates[]; // Traccia futura (blu)
  previousCoordinates?: Coordinates[]; // Storico delle coordinate precedenti
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementResult {
  distance: number; // Miglia nautiche
  bearing: number; // Rotta in gradi
  startPoint: Coordinates;
  endPoint: Coordinates;
}

export const WAYPOINT_COLORS = [
  '#FF6B6B', // Rosso
  '#4ECDC4', // Turchese
  '#45B7D1', // Blu
  '#96CEB4', // Verde
  '#FFEAA7', // Giallo
  '#DDA0DD', // Viola
  '#FFA07A', // Arancione
  '#98D8C8', // Verde acqua
];

export const TARGET_COLORS = [
  '#FF4757', // Rosso scuro
  '#2ED573', // Verde
  '#1E90FF', // Blu dodger
  '#FFA502', // Arancione
  '#A55EEA', // Viola
  '#26C6DA', // Ciano
  '#FF6348', // Rosso corallo
  '#7BED9F', // Verde menta
];