import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Waypoint, Target, Coordinates, MeasurementResult } from '@/types/nautical';
import { calculateDistance, calculateBearing } from '@/utils/coordinates';
import { WaypointContextMenu } from './WaypointContextMenu';
import { TargetContextMenu } from './TargetContextMenu';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface SimpleMapProps {
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

export interface SimpleMapRef {
  centerOnCoordinates: (coordinates: Coordinates) => void;
}

export const SimpleMap = forwardRef<SimpleMapRef, SimpleMapProps>(({
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
  } | null>(null);
  const [measurementPoints, setMeasurementPoints] = useState<Coordinates[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    centerOnCoordinates: (coordinates: Coordinates) => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const targetPixel = coordsToPixels(coordinates, rect);
      
      setPanOffset({
        x: centerX - targetPixel.x,
        y: centerY - targetPixel.y
      });
    }
  }), []);

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || isDragging) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.x) / zoom;
    const y = (event.clientY - rect.top - panOffset.y) / zoom;
    
    // Simuliamo coordinate basate sulla posizione del click
    const lat = 42.0 + (y - rect.height / 2) / (rect.height / 4);
    const lng = 12.0 + (x - rect.width / 2) / (rect.width / 4);
    const coordinates = { lat, lng };
    
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
  };

  const handleMapRightClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      type: 'empty',
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prevZoom => Math.max(0.5, Math.min(3, prevZoom + delta)));
  };

  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(3, prevZoom + 0.2));
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(0.5, prevZoom - 0.2));
  };

  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    const panAmount = 50;
    setPanOffset(prev => {
      switch (direction) {
        case 'up': return { ...prev, y: prev.y + panAmount };
        case 'down': return { ...prev, y: prev.y - panAmount };
        case 'left': return { ...prev, x: prev.x + panAmount };
        case 'right': return { ...prev, x: prev.x - panAmount };
        default: return prev;
      }
    });
  };

  const handleMarkerRightClick = (
    event: React.MouseEvent, 
    type: 'waypoint' | 'target', 
    item: Waypoint | Target
  ) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      type,
      item,
      x: event.clientX,
      y: event.clientY
    });
  };

  // Converti coordinate geografiche in pixel
  const coordsToPixels = (coords: Coordinates, containerRect: DOMRect) => {
    const baseX = ((coords.lng - 10.0) / 6.0) * containerRect.width;
    const baseY = ((44.0 - coords.lat) / 6.0) * containerRect.height;
    const x = baseX * zoom + panOffset.x;
    const y = baseY * zoom + panOffset.y;
    return { x, y };
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={handleZoomIn}
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={handleZoomOut}
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
            onClick={() => handlePan('up')}
          >
            <ArrowUp size={14} />
          </Button>
          <div></div>
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={() => handlePan('left')}
          >
            <ArrowLeft size={14} />
          </Button>
          <div></div>
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={() => handlePan('right')}
          >
            <ArrowRight size={14} />
          </Button>
          <div></div>
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-background/90 border-border"
            onClick={() => handlePan('down')}
          >
            <ArrowDown size={14} />
          </Button>
          <div></div>
        </div>
      </div>

      {/* Indicatore modalità misurazione */}
      {measurementMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium z-20">
          Modalità Misurazione Attiva - Clicca due punti
        </div>
      )}

      {/* Mappa */}
      <div
        ref={mapRef}
        className="w-full h-full bg-gradient-to-br from-nautical-navy-deep to-nautical-ocean-blue rounded-lg relative overflow-hidden"
        style={{ 
          cursor: isDragging ? 'grabbing' : measurementMode ? 'crosshair' : 'grab'
        }}
        onClick={handleMapClick}
        onContextMenu={handleMapRightClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Background pattern */}
        <div 
          className="absolute inset-0"
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            transformOrigin: 'center center',
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 1px, transparent 1px),
              radial-gradient(circle at 80% 70%, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(45deg, transparent 49%, rgba(255,255,255,0.05) 50%, transparent 51%)
            `,
            backgroundSize: '50px 50px, 80px 80px, 20px 20px'
          }}
        />

        {/* Grid nautico */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            transformOrigin: 'center center'
          }}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <div key={`h-${i}`} className="absolute w-full h-px bg-nautical-ocean-light" style={{ top: `${i * 10}%` }} />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <div key={`v-${i}`} className="absolute h-full w-px bg-nautical-ocean-light" style={{ left: `${i * 10}%` }} />
          ))}
        </div>

        {/* Tracce SVG con trasformazione corretta */}
        <svg 
          className="absolute inset-0 pointer-events-none w-full h-full"
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            transformOrigin: 'center center'
          }}
        >
          {targets.map((target) => {
            const rect = mapRef.current?.getBoundingClientRect();
            if (!rect) return null;
            
            return (
              <g key={`track-${target.id}`}>
                {/* Traccia passata */}
                {target.pastTrack && target.pastTrack.length > 1 && (
                  <polyline
                    points={target.pastTrack.map(coord => {
                      const baseX = ((coord.lng - 10.0) / 6.0) * rect.width;
                      const baseY = ((44.0 - coord.lat) / 6.0) * rect.height;
                      return `${baseX},${baseY}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#2c3e50"
                    strokeWidth="3"
                    opacity="0.8"
                  />
                )}

                {/* Traccia futura */}
                {target.futureTrack && target.futureTrack.length > 1 && (
                  <polyline
                    points={target.futureTrack.map(coord => {
                      const baseX = ((coord.lng - 10.0) / 6.0) * rect.width;
                      const baseY = ((44.0 - coord.lat) / 6.0) * rect.height;
                      return `${baseX},${baseY}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#3498db"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                    opacity="0.7"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Markers */}
        <div 
          className="absolute inset-0"
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            transformOrigin: 'center center'
          }}
        >
          {/* Waypoints */}
          {waypoints.map((waypoint) => {
            const rect = mapRef.current?.getBoundingClientRect();
            if (!rect) return null;
            
            const baseX = ((waypoint.coordinates.lng - 10.0) / 6.0) * rect.width;
            const baseY = ((44.0 - waypoint.coordinates.lat) / 6.0) * rect.height;
            
            return (
              <div
                key={waypoint.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                style={{ left: baseX, top: baseY }}
                onContextMenu={(e) => handleMarkerRightClick(e, 'waypoint', waypoint)}
                title={waypoint.name}
              >
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: waypoint.color }}
                />
                <div className="absolute top-7 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {waypoint.name}
                </div>
              </div>
            );
          })}

          {/* Targets */}
          {targets.map((target) => {
            const rect = mapRef.current?.getBoundingClientRect();
            if (!rect) return null;
            
            const baseX = ((target.coordinates.lng - 10.0) / 6.0) * rect.width;
            const baseY = ((44.0 - target.coordinates.lat) / 6.0) * rect.height;
            
            return (
              <div
                key={target.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer float-target z-10"
                style={{ left: baseX, top: baseY }}
                onContextMenu={(e) => handleMarkerRightClick(e, 'target', target)}
                title={`${target.name} - Rotta: ${target.course}° - Velocità: ${target.speed} kn`}
              >
                <div
                  className="w-0 h-0 border-l-6 border-r-6 border-b-8 border-transparent filter drop-shadow-lg"
                  style={{ 
                    borderBottomColor: target.color,
                    transform: `rotate(${target.course}deg)`
                  }}
                />
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {target.name} ({target.speed}kn)
                </div>
              </div>
            );
          })}

          {/* Punto di misurazione temporaneo */}
          {measurementPoints.length > 0 && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ 
                left: ((measurementPoints[0].lng - 10.0) / 6.0) * (mapRef.current?.getBoundingClientRect().width || 0),
                top: ((44.0 - measurementPoints[0].lat) / 6.0) * (mapRef.current?.getBoundingClientRect().height || 0)
              }}
            >
              <div className="w-3 h-3 bg-destructive border-2 border-white rounded-full pulse-radar" />
            </div>
          )}
        </div>

        {/* Coordinate display */}
        <div className="absolute bottom-4 left-4 bg-black/80 text-white text-xs px-2 py-1 rounded z-10">
          Centro: 42.0°N, 12.0°E | Zoom: {zoom.toFixed(1)}x
        </div>
      </div>

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
              className="fixed bg-card border border-border shadow-lg rounded-lg py-1 z-50"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                className="w-full px-4 py-2 text-sm text-foreground hover:bg-accent text-left"
                onClick={() => {
                  const rect = mapRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const x = (contextMenu.x - rect.left - panOffset.x) / zoom;
                  const y = (contextMenu.y - rect.top - panOffset.y) / zoom;
                  const lat = 42.0 + (y - rect.height / 2) / (rect.height / 4);
                  const lng = 12.0 + (x - rect.width / 2) / (rect.width / 4);
                  onAddWaypoint?.({ lat, lng });
                  setContextMenu(null);
                }}
              >
                Aggiungi Waypoint
              </button>
              <button
                className="w-full px-4 py-2 text-sm text-foreground hover:bg-accent text-left"
                onClick={() => {
                  // This would trigger add target modal in parent
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
          className="fixed inset-0 z-40" 
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  );
});