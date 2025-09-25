import React, { useState, useEffect } from 'react';
import { LeafletMap, LeafletMapRef } from '@/components/LeafletMap';
import { WaypointModal } from '@/components/WaypointModal';
import { TargetModal } from '@/components/TargetModal';
import { Waypoint, Target, Coordinates, MeasurementResult } from '@/types/nautical';
import { LocalStorage } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Anchor, Navigation, Ruler, Plus, Ship, MapPin, Target as TargetIcon, Edit, Trash2, ChevronDown } from 'lucide-react';
const Index = () => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurementResult, setMeasurementResult] = useState<MeasurementResult | null>(null);
  const [measurementEditMode, setMeasurementEditMode] = useState(false);
  const mapRef = React.useRef<LeafletMapRef>(null);

  // SAR Layers state
  const [sarLayers, setSarLayers] = useState({
    'Italia SAR': false,
    'Malta SAR': false,
    'Tunisia SAR': false,
    'Libia SAR': false,
    'Grecia SAR': false,
    'Frontex M1': false,
    'Frontex M2': false,
    'Frontex M3': false,
    'Frontex L1': false,
    'Frontex L2': false,
    'Frontex L3': false,
    'Frontex L4': false,
  });

  // Modal states
  const [waypointModal, setWaypointModal] = useState<{
    isOpen: boolean;
    waypoint?: Waypoint | null;
    coordinates?: Coordinates;
  }>({
    isOpen: false
  });
  const [targetModal, setTargetModal] = useState<{
    isOpen: boolean;
    target?: Target | null;
    coordinates?: Coordinates;
  }>({
    isOpen: false
  });

  // Carica dati al mount
  useEffect(() => {
    const loadedWaypoints = LocalStorage.loadWaypoints();
    const loadedTargets = LocalStorage.loadTargets();
    setWaypoints(loadedWaypoints);
    setTargets(loadedTargets);
  }, []);
  const handleAddWaypoint = (coordinates?: Coordinates) => {
    if (measurementMode) return; // Non aggiungere waypoint in modalità misurazione

    setWaypointModal({
      isOpen: true,
      waypoint: null,
      coordinates
    });
  };
  const handleWaypointSave = (waypoint: Waypoint) => {
    if (waypointModal.waypoint) {
      // Modifica esistente
      LocalStorage.updateWaypoint(waypoint);
      setWaypoints(prev => prev.map(w => w.id === waypoint.id ? waypoint : w));
    } else {
      // Nuovo waypoint
      LocalStorage.addWaypoint(waypoint);
      setWaypoints(prev => [...prev, waypoint]);
    }
  };
  const handleWaypointUpdate = (updatedWaypoint: Waypoint) => {
    setWaypointModal({
      isOpen: true,
      waypoint: updatedWaypoint
    });
  };
  const handleWaypointDelete = (waypointId: string) => {
    const waypoint = waypoints.find(w => w.id === waypointId);
    LocalStorage.deleteWaypoint(waypointId);
    setWaypoints(prev => prev.filter(w => w.id !== waypointId));
  };
  const handleAddTarget = (coordinates?: Coordinates) => {
    setTargetModal({
      isOpen: true,
      target: null,
      coordinates
    });
  };
  const handleTargetSave = (target: Target) => {
    if (targetModal.target) {
      // Modifica esistente
      LocalStorage.updateTarget(target);
      setTargets(prev => prev.map(t => t.id === target.id ? target : t));
    } else {
      // Nuovo target
      LocalStorage.addTarget(target);
      setTargets(prev => [...prev, target]);
    }
  };
  const handleTargetUpdate = (updatedTarget: Target) => {
    setTargetModal({
      isOpen: true,
      target: updatedTarget
    });
  };
  const handleTargetDelete = (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    LocalStorage.deleteTarget(targetId);
    setTargets(prev => prev.filter(t => t.id !== targetId));
  };
  const handleMeasurementResult = (result: MeasurementResult) => {
    setMeasurementResult(result);
    setMeasurementMode(false); // Disabilita automaticamente la modalità misurazione
    setMeasurementEditMode(false); // Disabilita modalità edit
  };

  const handleClearMeasurement = () => {
    setMeasurementResult(null);
    setMeasurementEditMode(false);
    // Notifica la mappa per pulire i marker
    mapRef.current?.clearMeasurement?.();
  };

  const handleEditMeasurement = () => {
    if (!measurementResult) return;
    setMeasurementEditMode(true);
    setMeasurementMode(true); // Riattiva modalità misurazione per permettere i click
  };
  const [manualToggle, setManualToggle] = useState(false);

  const toggleMeasurementMode = () => {
    setManualToggle(true);
    setMeasurementMode(!measurementMode);
    if (!measurementMode) {
      setMeasurementResult(null);
      setMeasurementEditMode(false);
    }
  };

  const handleManualToggleMeasurement = () => {
    setManualToggle(false);
  };
  return <div className="flex h-screen bg-background">
      {/* Sidebar sinistra */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Anchor className="text-primary" size={24} />
            <h1 className="text-xl font-bold text-foreground">Target Sospetti</h1>
          </div>
          
          {/* Pulsanti di controllo */}
          <div className="flex flex-col gap-2">
            <Button onClick={() => handleAddWaypoint()} className="w-full justify-start gap-2" variant="outline">
              <MapPin size={16} />
              Aggiungi Waypoint
            </Button>
            
            <Button onClick={() => handleAddTarget()} className="w-full justify-start gap-2" variant="outline">
              <Ship size={16} />
              Aggiungi Target
            </Button>
            
            <Button onClick={toggleMeasurementMode} className="w-full justify-start gap-2" variant={measurementMode ? "default" : "outline"}>
              <Ruler size={16} />
              {measurementMode ? 'Disattiva Misurazione' : 'Misura Distanza'}
            </Button>

            {/* SAR Layers Dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between gap-2">
                  Layer SAR
                  <ChevronDown size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-64 p-4 bg-card border border-border shadow-lg z-[1050]" 
                side="right" 
                align="start"
                onPointerLeave={(e) => {
                  // Chiudi il popover quando il cursore esce
                  const popover = e.currentTarget.closest('[data-radix-popper-content-wrapper]');
                  if (popover) {
                    const trigger = document.querySelector('[data-state="open"]');
                    if (trigger) {
                      (trigger as HTMLElement).click();
                    }
                  }
                }}
              >
                <h3 className="text-sm font-semibold text-foreground mb-3">Layer SAR</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(sarLayers).map(([layerName, isEnabled]) => (
                    <div key={layerName} className="flex items-center space-x-2">
                      <Checkbox
                        id={layerName}
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          setSarLayers(prev => ({
                            ...prev,
                            [layerName]: checked as boolean
                          }))
                        }
                      />
                      <label
                        htmlFor={layerName}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground"
                      >
                        {layerName}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Lista waypoints */}
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <MapPin size={14} />
              WAYPOINTS ({waypoints.length})
            </h3>
            <div className="space-y-2">
              {waypoints.map(waypoint => <Card key={waypoint.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => mapRef.current?.centerOnCoordinates(waypoint.coordinates)} onContextMenu={e => {
              e.preventDefault();
              // Apri direttamente il modal di modifica per i waypoint nella dashboard
              handleWaypointUpdate(waypoint);
            }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{
                    backgroundColor: waypoint.color
                  }} />
                      <span className="text-sm font-medium">{waypoint.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => {
                    e.stopPropagation();
                    handleWaypointUpdate(waypoint);
                  }}>
                        <Edit size={12} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={e => {
                    e.stopPropagation();
                    if (confirm(`Eliminare il waypoint "${waypoint.name}"?`)) {
                      handleWaypointDelete(waypoint.id);
                    }
                  }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {waypoint.coordinates.lat.toFixed(4)}°, {waypoint.coordinates.lng.toFixed(4)}°
                  </div>
                </Card>)}
            </div>
          </div>

          {/* Lista targets */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <TargetIcon size={14} />
              TARGET ({targets.length})
            </h3>
            <div className="space-y-2">
              {targets.map(target => <Card key={target.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => mapRef.current?.centerOnCoordinates(target.coordinates)} onContextMenu={e => {
              e.preventDefault();
              // Apri direttamente il modal di modifica per i target nella dashboard
              handleTargetUpdate(target);
            }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rotate-45" style={{
                    backgroundColor: target.color,
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                  }} />
                      <span className="text-sm font-medium">{target.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {target.speed.toFixed(1)} kn
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => {
                    e.stopPropagation();
                    handleTargetUpdate(target);
                  }}>
                        <Edit size={12} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={e => {
                    e.stopPropagation();
                    if (confirm(`Eliminare il target "${target.name}"?`)) {
                      handleTargetDelete(target.id);
                    }
                  }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Rotta: {target.course}° | Vel: {target.speed.toFixed(1)} nodi
                  </div>
                </Card>)}
            </div>
          </div>

        </div>
      </div>

      {/* Mappa */}
      <div className="flex-1">
      <LeafletMap ref={mapRef} waypoints={waypoints} targets={targets} onWaypointUpdate={handleWaypointUpdate} onWaypointDelete={handleWaypointDelete} onTargetUpdate={handleTargetUpdate} onTargetDelete={handleTargetDelete} onAddWaypoint={handleAddWaypoint} onAddTarget={handleAddTarget} measurementMode={measurementMode} measurementEditMode={measurementEditMode} measurementResult={measurementResult} onMeasurementResult={handleMeasurementResult} onManualToggleMeasurement={handleManualToggleMeasurement} onClearMeasurement={handleClearMeasurement} sarLayers={sarLayers} />
    </div>

      {/* Modal per waypoint */}
      <WaypointModal isOpen={waypointModal.isOpen} waypoint={waypointModal.waypoint} initialCoordinates={waypointModal.coordinates} onSave={handleWaypointSave} onClose={() => setWaypointModal({
      isOpen: false
    })} />

      {/* Modal per target */}
      <TargetModal isOpen={targetModal.isOpen} target={targetModal.target} initialCoordinates={targetModal.coordinates} onSave={handleTargetSave} onClose={() => setTargetModal({
      isOpen: false
    })} />
    </div>;
};
export default Index;