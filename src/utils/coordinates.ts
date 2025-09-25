import { Coordinates, SexagesimalCoordinates } from '@/types/nautical';

/**
 * Converte coordinate decimali in sessagesimali
 */
export function decimalToSexagesimal(coords: Coordinates): SexagesimalCoordinates {
  const convertSingle = (decimal: number, isLatitude: boolean) => {
    const abs = Math.abs(decimal);
    const degrees = Math.floor(abs);
    const minutesFloat = (abs - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = parseFloat(((minutesFloat - minutes) * 60).toFixed(2));
    
    let hemisphere: 'N' | 'S' | 'E' | 'W';
    if (isLatitude) {
      hemisphere = decimal >= 0 ? 'N' : 'S';
    } else {
      hemisphere = decimal >= 0 ? 'E' : 'W';
    }
    
    return { degrees, minutes, seconds, hemisphere };
  };

  return {
    lat: convertSingle(coords.lat, true) as { degrees: number; minutes: number; seconds: number; hemisphere: 'N' | 'S' },
    lng: convertSingle(coords.lng, false) as { degrees: number; minutes: number; seconds: number; hemisphere: 'E' | 'W' }
  };
}

/**
 * Converte coordinate sessagesimali in decimali
 */
export function sexagesimalToDecimal(coords: SexagesimalCoordinates): Coordinates {
  const convertSingle = (deg: number, min: number, sec: number, hemisphere: string) => {
    const decimal = deg + (min / 60) + (sec / 3600);
    return (hemisphere === 'S' || hemisphere === 'W') ? -decimal : decimal;
  };

  return {
    lat: convertSingle(coords.lat.degrees, coords.lat.minutes, coords.lat.seconds, coords.lat.hemisphere),
    lng: convertSingle(coords.lng.degrees, coords.lng.minutes, coords.lng.seconds, coords.lng.hemisphere)
  };
}

/**
 * Calcola la distanza in miglia nautiche tra due punti
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 3440.065; // Raggio della Terra in miglia nautiche
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcola il bearing (rotta) tra due punti in gradi
 */
export function calculateBearing(point1: Coordinates, point2: Coordinates): number {
  const dLng = toRadians(point2.lng - point1.lng);
  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Calcola la posizione di un target in base a rotta, velocità e tempo
 */
export function calculateTargetPosition(
  startPosition: Coordinates,
  course: number,
  speed: number,
  timeElapsedHours: number
): Coordinates {
  const R = 3440.065; // Raggio della Terra in miglia nautiche
  const distance = speed * timeElapsedHours; // Distanza in miglia nautiche
  
  const lat1 = toRadians(startPosition.lat);
  const lng1 = toRadians(startPosition.lng);
  const bearing = toRadians(course);
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / R) +
    Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearing)
  );
  
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(distance / R) * Math.cos(lat1),
    Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lng2)
  };
}

/**
 * Genera la traccia futura di un target
 */
export function generateFutureTrack(
  position: Coordinates,
  course: number,
  speed: number,
  hours: number = 24,
  points: number = 48
): Coordinates[] {
  const track: Coordinates[] = [];
  const hoursPerPoint = hours / points;
  
  for (let i = 0; i <= points; i++) {
    const timeElapsed = i * hoursPerPoint;
    const futurePosition = calculateTargetPosition(position, course, speed, timeElapsed);
    track.push(futurePosition);
  }
  
  return track;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}