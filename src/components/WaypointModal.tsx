import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Waypoint, Coordinates, SexagesimalCoordinates, WAYPOINT_COLORS } from '@/types/nautical';
import { decimalToSexagesimal, sexagesimalToDecimal } from '@/utils/coordinates';
import { MapPin } from 'lucide-react';

interface WaypointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (waypoint: Waypoint) => void;
  waypoint?: Waypoint | null;
  initialCoordinates?: Coordinates;
}

export const WaypointModal: React.FC<WaypointModalProps> = ({
  isOpen,
  onClose,
  onSave,
  waypoint,
  initialCoordinates
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(WAYPOINT_COLORS[0]);
  const [coordinateType, setCoordinateType] = useState<'decimal' | 'sexagesimal'>('decimal');
  
  // Coordinate decimali
  const [decimalCoords, setDecimalCoords] = useState<Coordinates>({ lat: 42.0, lng: 12.0 });
  
  // Coordinate sessagesimali
  const [sexagesimalCoords, setSexagesimalCoords] = useState<SexagesimalCoordinates>({
    lat: { degrees: 42, minutes: 0, seconds: 0, hemisphere: 'N' },
    lng: { degrees: 12, minutes: 0, seconds: 0, hemisphere: 'E' }
  });

  // Inizializza i valori quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      if (waypoint) {
        // Modalità modifica
        setName(waypoint.name);
        setColor(waypoint.color);
        setDecimalCoords(waypoint.coordinates);
        setSexagesimalCoords(decimalToSexagesimal(waypoint.coordinates));
      } else {
        // Modalità creazione
        const coords = initialCoordinates || { lat: 42.0, lng: 12.0 };
        setName(`Waypoint ${Date.now().toString().slice(-4)}`);
        setColor(WAYPOINT_COLORS[Math.floor(Math.random() * WAYPOINT_COLORS.length)]);
        setDecimalCoords(coords);
        setSexagesimalCoords(decimalToSexagesimal(coords));
      }
      setCoordinateType('decimal');
    }
  }, [isOpen, waypoint, initialCoordinates]);

  // Aggiorna coordinate sessagesimali quando cambiano quelle decimali
  useEffect(() => {
    if (coordinateType === 'decimal') {
      setSexagesimalCoords(decimalToSexagesimal(decimalCoords));
    }
  }, [decimalCoords, coordinateType]);

  // Aggiorna coordinate decimali quando cambiano quelle sessagesimali
  useEffect(() => {
    if (coordinateType === 'sexagesimal') {
      setDecimalCoords(sexagesimalToDecimal(sexagesimalCoords));
    }
  }, [sexagesimalCoords, coordinateType]);

  const handleDecimalChange = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value) || 0;
    setDecimalCoords(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSexagesimalChange = (
    coord: 'lat' | 'lng',
    field: 'degrees' | 'minutes' | 'seconds' | 'hemisphere',
    value: string | number
  ) => {
    setSexagesimalCoords(prev => ({
      ...prev,
      [coord]: {
        ...prev[coord],
        [field]: field === 'hemisphere' ? value : (parseFloat(value.toString()) || 0)
      }
    }));
  };

  const handleSave = () => {
    const finalCoords = coordinateType === 'decimal' 
      ? decimalCoords 
      : sexagesimalToDecimal(sexagesimalCoords);

    // Se è una modifica di waypoint esistente, aggiungi le coordinate attuali allo storico
    let previousCoordinates = waypoint?.previousCoordinates || [];
    if (waypoint && (waypoint.coordinates.lat !== finalCoords.lat || waypoint.coordinates.lng !== finalCoords.lng)) {
      previousCoordinates = [...previousCoordinates, waypoint.coordinates];
    }

    const waypointData: Waypoint = {
      id: waypoint?.id || `waypoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || 'Waypoint Senza Nome',
      coordinates: finalCoords,
      color,
      previousCoordinates,
      createdAt: waypoint?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(waypointData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin size={20} />
            {waypoint ? 'Modifica Waypoint' : 'Nuovo Waypoint'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci nome waypoint"
            />
          </div>

          {/* Colore */}
          <div>
            <Label>Colore Segnaposto</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {WAYPOINT_COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === colorOption ? 'border-primary' : 'border-muted'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
            </div>
          </div>

          {/* Tipo coordinate */}
          <div>
            <Label>Sistema di Coordinate</Label>
            <RadioGroup
              value={coordinateType}
              onValueChange={(value) => setCoordinateType(value as 'decimal' | 'sexagesimal')}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="decimal" id="decimal" />
                <Label htmlFor="decimal">Decimali</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sexagesimal" id="sexagesimal" />
                <Label htmlFor="sexagesimal">Sessagesimali</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Coordinate Decimali */}
          {coordinateType === 'decimal' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat-decimal">Latitudine</Label>
                <Input
                  id="lat-decimal"
                  type="number"
                  step="0.000001"
                  value={decimalCoords.lat}
                  onChange={(e) => handleDecimalChange('lat', e.target.value)}
                  placeholder="42.123456"
                />
              </div>
              <div>
                <Label htmlFor="lng-decimal">Longitudine</Label>
                <Input
                  id="lng-decimal"
                  type="number"
                  step="0.000001"
                  value={decimalCoords.lng}
                  onChange={(e) => handleDecimalChange('lng', e.target.value)}
                  placeholder="12.123456"
                />
              </div>
            </div>
          ) : (
            /* Coordinate Sessagesimali */
            <div className="space-y-4">
              {/* Latitudine */}
              <div>
                <Label>Latitudine</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={sexagesimalCoords.lat.degrees}
                    onChange={(e) => handleSexagesimalChange('lat', 'degrees', e.target.value)}
                    placeholder="Gradi"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={sexagesimalCoords.lat.minutes}
                    onChange={(e) => handleSexagesimalChange('lat', 'minutes', e.target.value)}
                    placeholder="Minuti"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="59.999"
                    step="0.001"
                    value={sexagesimalCoords.lat.seconds}
                    onChange={(e) => handleSexagesimalChange('lat', 'seconds', e.target.value)}
                    placeholder="Secondi"
                  />
                  <Select
                    value={sexagesimalCoords.lat.hemisphere}
                    onValueChange={(value) => handleSexagesimalChange('lat', 'hemisphere', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N">N</SelectItem>
                      <SelectItem value="S">S</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Longitudine */}
              <div>
                <Label>Longitudine</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="180"
                    value={sexagesimalCoords.lng.degrees}
                    onChange={(e) => handleSexagesimalChange('lng', 'degrees', e.target.value)}
                    placeholder="Gradi"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={sexagesimalCoords.lng.minutes}
                    onChange={(e) => handleSexagesimalChange('lng', 'minutes', e.target.value)}
                    placeholder="Minuti"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="59.999"
                    step="0.001"
                    value={sexagesimalCoords.lng.seconds}
                    onChange={(e) => handleSexagesimalChange('lng', 'seconds', e.target.value)}
                    placeholder="Secondi"
                  />
                  <Select
                    value={sexagesimalCoords.lng.hemisphere}
                    onValueChange={(value) => handleSexagesimalChange('lng', 'hemisphere', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="W">W</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Anteprima conversione */}
          <div className="bg-muted p-3 rounded-lg text-sm">
            <div className="font-medium mb-1">Anteprima:</div>
            <div>Decimali: {decimalCoords.lat.toFixed(6)}°, {decimalCoords.lng.toFixed(6)}°</div>
            <div>
              Sessagesimali: {sexagesimalCoords.lat.degrees}° {sexagesimalCoords.lat.minutes}' {sexagesimalCoords.lat.seconds.toFixed(2)}" {sexagesimalCoords.lat.hemisphere}, {sexagesimalCoords.lng.degrees}° {sexagesimalCoords.lng.minutes}' {sexagesimalCoords.lng.seconds.toFixed(2)}" {sexagesimalCoords.lng.hemisphere}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleSave}>
            {waypoint ? 'Aggiorna' : 'Crea'} Waypoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};