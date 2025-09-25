import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Waypoint, Target, Coordinates, MeasurementResult } from '@/types/nautical';
import { calculateDistance, calculateBearing } from '@/utils/coordinates';
import { WaypointContextMenu } from './WaypointContextMenu';
import { TargetContextMenu } from './TargetContextMenu';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

// Fix per icone Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface NauticalMapProps {
  waypoints: Waypoint[];
  targets: Target[];
  onWaypointUpdate: (waypoint: Waypoint) => void;
  onWaypointDelete: (waypointId: string) => void;
  onTargetUpdate: (target: Target) => void;
  onTargetDelete: (targetId: string) => void;
  onAddWaypoint?: (coordinates: Coordinates) => void;
  measurementMode: boolean;
  onMeasurementResult?: (result: MeasurementResult) => void;
}

export interface NauticalMapRef {
  centerOnCoordinates: (coordinates: Coordinates) => void;
}

// Componente per il controllo della mappa
const MapController = forwardRef<NauticalMapRef, {}>((_, ref) => {
  const map = useMap();

  useImperativeHandle(ref, () => ({
    centerOnCoordinates: (coordinates: Coordinates) => {
      map.setView([coordinates.lat, coordinates.lng], map.getZoom());
    }
  }), [map]);

  return null;
});

MapController.displayName = 'MapController';

// Componente per gestire gli eventi della mappa
function MapEventHandler({ 
  onAddWaypoint, 
  measurementMode, 
  onMeasurementResult, 
  measurementPoints, 
  setMeasurementPoints,
  setContextMenu
}: {
  onAddWaypoint?: (coordinates: Coordinates) => void;
  measurementMode: boolean;
  onMeasurementResult?: (result: MeasurementResult) => void;
  measurementPoints: Coordinates[];
  setMeasurementPoints: React.Dispatch<React.SetStateAction<Coordinates[]>>;
  setContextMenu: React.Dispatch<React.SetStateAction<any>>;
}) {
  useMapEvents({
    click(e) {
      const coordinates = { lat: e.latlng.lat, lng: e.latlng.lng };
      
      if (measurementMode) {
        if (measurementPoints.length === 0) {
          setMeasurementPoints([coordinates]);
        } else if (measurementPoints.length === 1) {
          const startPoint = measurementPoints[0];
          const distance = calculateDistance(startPoint, coordinates);
          const bearing = calculateBearing(startPoint, coordinates);
          
          const result: MeasurementResult = {
            distance,
            bearing,
            startPoint,
            endPoint: coordinates
          };
          
          onMeasurementResult?.(result);
          setMeasurementPoints([]);
        }
      } else {
        onAddWaypoint?.(coordinates);
      }
    },
    contextmenu(e) {
      e.originalEvent.preventDefault();
      setContextMenu({
        type: 'empty',
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
        coordinates: { lat: e.latlng.lat, lng: e.latlng.lng }
      });
    }
  });
  
  return null;
}

export const NauticalMap = forwardRef<NauticalMapRef, NauticalMapProps>(({
  waypoints,
  targets,
  onWaypointUpdate,
  onWaypointDelete,
  onTargetUpdate,
  onTargetDelete,
  onAddWaypoint,
  measurementMode,
  onMeasurementResult
}, ref) => {
  const [contextMenu, setContextMenu] = useState<{
    type: 'waypoint' | 'target' | 'empty';
    item?: Waypoint | Target;
    x: number;
    y: number;
    coordinates?: Coordinates;
  } | null>(null);
  const [measurementPoints, setMeasurementPoints] = useState<Coordinates[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Aggiorna la posizione dei target in tempo reale
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Aggiorna ogni 30 secondi

    return () => clearInterval(interval);
  }, []);

  // Crea icone personalizzate per waypoint
  const createWaypointIcon = (color: string) => {
    return L.divIcon({
      className: 'custom-waypoint-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  // Crea icone personalizzate per target (a forma di barca)
  const createTargetIcon = (color: string) => {
    return L.divIcon({
      className: 'custom-target-marker float-target',
      html: `
        <div style="
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 20px solid ${color};
          position: relative;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        ">
          <div style="
            position: absolute;
            top: 20px;
            left: -6px;
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid ${color};
          "></div>
        </div>
      `,
      iconSize: [16, 28],
      iconAnchor: [8, 28],
    });
  };

  // Calcola la posizione corrente di un target
  const getCurrentTargetPosition = (target: Target): Coordinates => {
    const targetTime = new Date(target.timestamp);
    const hoursElapsed = (currentTime.getTime() - targetTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursElapsed < 0) return target.coordinates;
    
    // Usa l'ultima posizione del track passato se disponibile
    const lastPosition = target.pastTrack.length > 0 
      ? target.pastTrack[target.pastTrack.length - 1] 
      : target.coordinates;
    
    // Calcola la posizione corrente basata sulla rotta e velocità
    const R = 3440.065; // Raggio Terra in miglia nautiche
    const distance = target.speed * hoursElapsed;
    
    const lat1 = (lastPosition.lat * Math.PI) / 180;
    const lng1 = (lastPosition.lng * Math.PI) / 180;
    const bearing = (target.course * Math.PI) / 180;
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance / R) +
      Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearing)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(distance / R) * Math.cos(lat1),
      Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    return {
      lat: (lat2 * 180) / Math.PI,
      lng: (lng2 * 180) / Math.PI
    };
  };

  const handleMarkerRightClick = (
    e: L.LeafletMouseEvent, 
    type: 'waypoint' | 'target', 
    item: Waypoint | Target
  ) => {
    e.originalEvent.preventDefault();
    setContextMenu({
      type,
      item,
      x: e.originalEvent.clientX,
      y: e.originalEvent.clientY
    });
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={() => {
              // Zoom implementato tramite Leaflet
            }}
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={() => {
              // Zoom implementato tramite Leaflet
            }}
          >
            <ZoomOut size={16} />
          </Button>
        </div>
        
        {/* Pan Controls */}
        <div className="grid grid-cols-3 gap-1 w-24">
          <div></div>
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={() => {
              // Pan implementato tramite Leaflet
            }}
          >
            <ArrowUp size={14} />
          </Button>
          <div></div>
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={() => {
              // Pan implementato tramite Leaflet
            }}
          >
            <ArrowLeft size={14} />
          </Button>
          <div></div>
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={() => {
              // Pan implementato tramite Leaflet
            }}
          >
            <ArrowRight size={14} />
          </Button>
          <div></div>
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={() => {
              // Pan implementato tramite Leaflet
            }}
          >
            <ArrowDown size={14} />
          </Button>
          <div></div>
        </div>
      </div>

      {/* Indicatore modalità misurazione */}
      {measurementMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium z-[1000]">
          Modalità Misurazione Attiva - Clicca due punti
        </div>
      )}

      <MapContainer
        center={[42.0, 12.0]} // Centro Italia per default
        zoom={6}
        className="w-full h-full rounded-lg"
        zoomControl={true}
        attributionControl={false}
      >
        <MapController ref={ref} />

        {/* Tile layer base - OpenStreetMap per iniziare */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Event handler per click sulla mappa */}
        <MapEventHandler
          onAddWaypoint={onAddWaypoint}
          measurementMode={measurementMode}
          onMeasurementResult={onMeasurementResult}
          measurementPoints={measurementPoints}
          setMeasurementPoints={setMeasurementPoints}
          setContextMenu={setContextMenu}
        />

        {/* Rendering waypoints */}
        {waypoints.map((waypoint) => (
          <Marker
            key={waypoint.id}
            position={[waypoint.coordinates.lat, waypoint.coordinates.lng]}
            icon={createWaypointIcon(waypoint.color)}
            eventHandlers={{
              contextmenu: (e) => handleMarkerRightClick(e, 'waypoint', waypoint)
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{waypoint.name}</strong>
                <br />
                Lat: {waypoint.coordinates.lat.toFixed(6)}°
                <br />
                Lng: {waypoint.coordinates.lng.toFixed(6)}°
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Rendering targets e loro tracce */}
        {targets.map((target) => {
          const currentPosition = getCurrentTargetPosition(target);
          
          return (
            <React.Fragment key={target.id}>
              {/* Traccia passata (nera) */}
              {target.pastTrack.length > 0 && (
                <Polyline
                  positions={target.pastTrack.map(p => [p.lat, p.lng])}
                  color="#2c3e50"
                  weight={3}
                  opacity={0.8}
                />
              )}

              {/* Traccia futura (blu) */}
              {target.futureTrack.length > 0 && (
                <Polyline
                  positions={target.futureTrack.map(p => [p.lat, p.lng])}
                  color="#3498db"
                  weight={3}
                  opacity={0.7}
                  dashArray="10,5"
                />
              )}

              {/* Target marker (posizione corrente) */}
              <Marker
                position={[currentPosition.lat, currentPosition.lng]}
                icon={createTargetIcon(target.color)}
                eventHandlers={{
                  contextmenu: (e) => handleMarkerRightClick(e, 'target', target)
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{target.name}</strong>
                    <br />
                    Posizione corrente:
                    <br />
                    Lat: {currentPosition.lat.toFixed(6)}°
                    <br />
                    Lng: {currentPosition.lng.toFixed(6)}°
                    <br />
                    Rotta: {target.course}°
                    <br />
                    Velocità: {target.speed} kn
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Linea di misurazione temporanea */}
        {measurementPoints.length > 0 && (
          <Marker
            position={[measurementPoints[0].lat, measurementPoints[0].lng]}
            icon={L.divIcon({
              className: 'measurement-start',
              html: '<div style="width: 10px; height: 10px; background: #e74c3c; border: 2px solid white; border-radius: 50%;"></div>',
              iconSize: [10, 10],
              iconAnchor: [5, 5]
            })}
          />
        )}
      </MapContainer>

      {/* Menu contestuali */}
      {contextMenu && (
        <>
          {contextMenu.type === 'waypoint' ? (
            <WaypointContextMenu
              waypoint={contextMenu.item as Waypoint}
              x={contextMenu.x}
              y={contextMenu.y}
              onUpdate={onWaypointUpdate}
              onDelete={onWaypointDelete}
              onClose={() => setContextMenu(null)}
            />
          ) : contextMenu.type === 'target' ? (
            <TargetContextMenu
              target={contextMenu.item as Target}
              x={contextMenu.x}
              y={contextMenu.y}
              onUpdate={onTargetUpdate}
              onDelete={onTargetDelete}
              onClose={() => setContextMenu(null)}
            />
          ) : (
            <div
              className="fixed bg-card border border-border shadow-lg rounded-lg py-1 z-[1001]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                className="w-full px-4 py-2 text-sm text-foreground hover:bg-accent text-left"
                onClick={() => {
                  if (contextMenu.coordinates) {
                    onAddWaypoint?.(contextMenu.coordinates);
                  }
                  setContextMenu(null);
                }}
              >
                Aggiungi Waypoint
              </button>
              <button
                className="w-full px-4 py-2 text-sm text-foreground hover:bg-accent text-left"
                onClick={() => {
                  // Trigger add target modal
                  setContextMenu(null);
                }}
              >
                Aggiungi Target
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Click outside to close context menu */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-[1000]" 
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  );
});

NauticalMap.displayName = 'NauticalMap';