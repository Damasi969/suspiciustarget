import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Target, Coordinates, SexagesimalCoordinates, TARGET_COLORS } from '@/types/nautical';
import { decimalToSexagesimal, sexagesimalToDecimal, generateFutureTrack } from '@/utils/coordinates';
import { Ship } from 'lucide-react';

interface TargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (target: Target) => void;
  target?: Target | null;
  initialCoordinates?: Coordinates;
}

export const TargetModal: React.FC<TargetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  target,
  initialCoordinates
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TARGET_COLORS[0]);
  const [coordinateType, setCoordinateType] = useState<'decimal' | 'sexagesimal'>('decimal');
  const [course, setCourse] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [referenceDate, setReferenceDate] = useState('');
  const [referenceTime, setReferenceTime] = useState('');
  
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
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);

      if (target) {
        // Modalità modifica
        setName(target.name);
        setColor(target.color);
        setCourse(target.course);
        setSpeed(target.speed);
        
        const targetDate = new Date(target.timestamp);
        setReferenceDate(targetDate.toISOString().split('T')[0]);
        setReferenceTime(targetDate.toTimeString().slice(0, 5));
        
        setDecimalCoords(target.coordinates);
        setSexagesimalCoords(decimalToSexagesimal(target.coordinates));
      } else {
        // Modalità creazione
        const coords = initialCoordinates || { lat: 42.0, lng: 12.0 };
        setName(`Target ${Date.now().toString().slice(-4)}`);
        setColor(TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)]);
        setCourse(Math.floor(Math.random() * 360));
        setSpeed(parseFloat((5 + Math.random() * 15).toFixed(1)));
        setReferenceDate(dateStr);
        setReferenceTime(timeStr);
        
        setDecimalCoords(coords);
        setSexagesimalCoords(decimalToSexagesimal(coords));
      }
      setCoordinateType('decimal');
    }
  }, [isOpen, target, initialCoordinates]);

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

    // Crea timestamp dalla data e ora
    const timestamp = new Date(`${referenceDate}T${referenceTime}:00`).toISOString();

    // Genera traccia futura
    const futureTrack = generateFutureTrack(finalCoords, course, speed, 24, 48);

    // Mantieni traccia passata esistente o creane una vuota
    const pastTrack = target?.pastTrack || [];

    // Se è una modifica di target esistente, aggiungi le coordinate attuali allo storico
    let previousCoordinates = target?.previousCoordinates || [];
    if (target && (target.coordinates.lat !== finalCoords.lat || target.coordinates.lng !== finalCoords.lng)) {
      previousCoordinates = [...previousCoordinates, target.coordinates];
    }

    const targetData: Target = {
      id: target?.id || `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || 'Target Senza Nome',
      coordinates: finalCoords,
      course: Math.max(0, Math.min(359, course)),
      speed: Math.max(0, speed),
      timestamp,
      color,
      pastTrack,
      futureTrack,
      previousCoordinates,
      createdAt: target?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(targetData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship size={20} />
            {target ? 'Modifica Target' : 'Nuovo Target'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="target-name">Nome</Label>
            <Input
              id="target-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci nome target"
            />
          </div>

          {/* Colore */}
          <div>
            <Label>Colore Barca</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TARGET_COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  className={`w-8 h-8 border-2 ${
                    color === colorOption ? 'border-primary' : 'border-muted'
                  }`}
                  style={{ 
                    backgroundColor: colorOption,
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                  }}
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
                <RadioGroupItem value="decimal" id="target-decimal" />
                <Label htmlFor="target-decimal">Decimali</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sexagesimal" id="target-sexagesimal" />
                <Label htmlFor="target-sexagesimal">Sessagesimali</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Coordinate Decimali */}
          {coordinateType === 'decimal' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target-lat-decimal">Latitudine</Label>
                <Input
                  id="target-lat-decimal"
                  type="number"
                  step="0.000001"
                  value={decimalCoords.lat}
                  onChange={(e) => handleDecimalChange('lat', e.target.value)}
                  placeholder="42.123456"
                />
              </div>
              <div>
                <Label htmlFor="target-lng-decimal">Longitudine</Label>
                <Input
                  id="target-lng-decimal"
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

          {/* Rotta e Velocità */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="course">Rotta (°)</Label>
              <Input
                id="course"
                type="number"
                min="0"
                max="359"
                value={course}
                onChange={(e) => setCourse(parseInt(e.target.value) || 0)}
                placeholder="000"
              />
            </div>
            <div>
              <Label htmlFor="speed">Velocità (nodi)</Label>
              <Input
                id="speed"
                type="number"
                min="0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(parseFloat(e.target.value).toFixed(1)) || 0)}
                placeholder="10.0"
              />
            </div>
          </div>

          {/* Data e Ora di Riferimento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ref-date">Data di Riferimento</Label>
              <Input
                id="ref-date"
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ref-time">Ora di Riferimento</Label>
              <Input
                id="ref-time"
                type="time"
                value={referenceTime}
                onChange={(e) => setReferenceTime(e.target.value)}
              />
            </div>
          </div>

          {/* Anteprima conversione */}
          <div className="bg-muted p-3 rounded-lg text-sm">
            <div className="font-medium mb-1">Anteprima:</div>
            <div>Posizione: {decimalCoords.lat.toFixed(6)}°, {decimalCoords.lng.toFixed(6)}°</div>
            <div>Rotta: {course}° | Velocità: {speed.toFixed(1)} nodi</div>
            <div>Riferimento: {referenceDate} {referenceTime}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleSave}>
            {target ? 'Aggiorna' : 'Crea'} Target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};