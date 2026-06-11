import { create } from 'zustand';
import { API_BASE } from '../config/api.config';
import { getAuthToken } from '../utils/secureStorage';

export interface Vehicle {
  id: number;
  registrationNumber: string;
  vehicleType: 'SEDAN' | 'SUV' | 'HATCHBACK' | 'VAN' | string;
  color?: string;
  brandModel?: string;
  capacity?: number;
  ownershipType?: string;
}

interface VehiclesState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number;
  fetchVehicles: (force?: boolean) => Promise<void>;
  addVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (id: number) => void;
  clear: () => void;
}

const STALE_MS = 60_000; // re-fetch if cache older than 1 min

/**
 * Single source of truth for the user's vehicles. Used by my-vehicles,
 * find-space, vehicle-select, and my-spaces. Cached so screens don't
 * re-fetch on every focus.
 */
export const useVehiclesStore = create<VehiclesState>((set, get) => ({
  vehicles: [],
  loading: false,
  error: null,
  lastFetchedAt: 0,

  fetchVehicles: async (force = false) => {
    const now = Date.now();
    if (!force && get().vehicles.length > 0 && now - get().lastFetchedAt < STALE_MS) {
      return;
    }
    try {
      set({ loading: true, error: null });
      const token = await getAuthToken();
      if (!token) {
        set({ vehicles: [], loading: false });
        return;
      }
      const res = await fetch(`${API_BASE}/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const raw: any[] = Array.isArray(json) ? json : json.data || json.vehicles || [];
      const mapped: Vehicle[] = raw.map((v: any) => ({
        id: v.id,
        registrationNumber: v.licensePlate || v.registrationNumber,
        vehicleType: v.vehicleType,
        color: v.color || '',
        brandModel: v.brandModel,
        capacity: v.capacity,
        ownershipType: v.ownershipType,
      }));
      set({ vehicles: mapped, lastFetchedAt: now, loading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load vehicles', loading: false });
    }
  },

  addVehicle: (vehicle) =>
    set((state) => ({ vehicles: [...state.vehicles, vehicle] })),

  removeVehicle: (id) =>
    set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== id) })),

  clear: () => set({ vehicles: [], lastFetchedAt: 0, error: null }),
}));
