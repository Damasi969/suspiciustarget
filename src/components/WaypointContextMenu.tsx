import React, { useEffect, useRef } from 'react';
import { Waypoint } from '@/types/nautical';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';

interface WaypointContextMenuProps {
  waypoint: Waypoint;
  x: number;
  y: number;
  onUpdate: (waypoint: Waypoint) => void;
  onDelete: (waypointId: string) => void;
  onClose: () => void;
}

export const WaypointContextMenu: React.FC<WaypointContextMenuProps> = ({
  waypoint,
  x,
  y,
  onUpdate,
  onDelete,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleUpdate = () => {
    // Per ora implementiamo un aggiornamento semplice
    // TODO: Aprire modal di modifica
    onUpdate(waypoint);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Sei sicuro di voler eliminare il waypoint "${waypoint.name}"?`)) {
      onDelete(waypoint.id);
      onClose();
    }
  };

  return (
    <Card
      ref={menuRef}
      className="fixed z-[2002] p-1 bg-card border border-border shadow-lg min-w-[160px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -10px)'
      }}
    >
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 h-8 px-2"
          onClick={handleUpdate}
        >
          <Edit size={14} />
          Aggiorna Waypoint
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 h-8 px-2 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 size={14} />
          Elimina Waypoint
        </Button>
      </div>
    </Card>
  );
};