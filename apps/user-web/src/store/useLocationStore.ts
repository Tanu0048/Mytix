import { create } from 'zustand';

interface LocationState {
  selectedCity: string;
  availableCities: string[];
  isLocationModalOpen: boolean;
  setSelectedCity: (city: string) => void;
  setAvailableCities: (cities: string[]) => void;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  initialize: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  selectedCity: 'All Cities',
  availableCities: [],
  isLocationModalOpen: false,

  setSelectedCity: (city: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mytix_selected_city', city);
    }
    set({ selectedCity: city });
  },

  setAvailableCities: (cities: string[]) => {
    set({ availableCities: cities });
  },

  openLocationModal: () => set({ isLocationModalOpen: true }),
  closeLocationModal: () => set({ isLocationModalOpen: false }),

  initialize: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mytix_selected_city');
      if (stored) {
        set({ selectedCity: stored });
      }
    }
  }
}));
