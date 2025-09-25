import { Waypoint, Target } from '@/types/nautical';

const WAYPOINTS_KEY = 'nautical_waypoints';
const TARGETS_KEY = 'nautical_targets';

/**
 * Storage manager per waypoint e target
 */
export class LocalStorage {
  // Waypoint management
  static saveWaypoints(waypoints: Waypoint[]): void {
    try {
      localStorage.setItem(WAYPOINTS_KEY, JSON.stringify(waypoints));
    } catch (error) {
      console.error('Errore nel salvare i waypoint:', error);
    }
  }

  static loadWaypoints(): Waypoint[] {
    try {
      const data = localStorage.getItem(WAYPOINTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Errore nel caricare i waypoint:', error);
      return [];
    }
  }

  static addWaypoint(waypoint: Waypoint): void {
    const waypoints = this.loadWaypoints();
    waypoints.push(waypoint);
    this.saveWaypoints(waypoints);
  }

  static updateWaypoint(updatedWaypoint: Waypoint): void {
    const waypoints = this.loadWaypoints();
    const index = waypoints.findIndex(w => w.id === updatedWaypoint.id);
    if (index !== -1) {
      waypoints[index] = updatedWaypoint;
      this.saveWaypoints(waypoints);
    }
  }

  static deleteWaypoint(waypointId: string): void {
    const waypoints = this.loadWaypoints();
    const filtered = waypoints.filter(w => w.id !== waypointId);
    this.saveWaypoints(filtered);
  }

  // Target management
  static saveTargets(targets: Target[]): void {
    try {
      localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    } catch (error) {
      console.error('Errore nel salvare i target:', error);
    }
  }

  static loadTargets(): Target[] {
    try {
      const data = localStorage.getItem(TARGETS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Errore nel caricare i target:', error);
      return [];
    }
  }

  static addTarget(target: Target): void {
    const targets = this.loadTargets();
    targets.push(target);
    this.saveTargets(targets);
  }

  static updateTarget(updatedTarget: Target): void {
    const targets = this.loadTargets();
    const index = targets.findIndex(t => t.id === updatedTarget.id);
    if (index !== -1) {
      targets[index] = updatedTarget;
      this.saveTargets(targets);
    }
  }

  static deleteTarget(targetId: string): void {
    const targets = this.loadTargets();
    const filtered = targets.filter(t => t.id !== targetId);
    this.saveTargets(filtered);
  }

  // Utility methods
  static clearAllData(): void {
    localStorage.removeItem(WAYPOINTS_KEY);
    localStorage.removeItem(TARGETS_KEY);
  }

  static exportData(): { waypoints: Waypoint[], targets: Target[] } {
    return {
      waypoints: this.loadWaypoints(),
      targets: this.loadTargets()
    };
  }

  static importData(data: { waypoints?: Waypoint[], targets?: Target[] }): void {
    if (data.waypoints) {
      this.saveWaypoints(data.waypoints);
    }
    if (data.targets) {
      this.saveTargets(data.targets);
    }
  }
}