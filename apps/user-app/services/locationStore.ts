import AsyncStorage from '@react-native-async-storage/async-storage';

type LocationListener = (city: string) => void;
const listeners = new Set<LocationListener>();

let currentCity = 'All Cities';

export const LocationStore = {
  getCity: () => currentCity,
  
  init: async () => {
    try {
      const stored = await AsyncStorage.getItem('mytix_selected_city');
      if (stored) {
        currentCity = stored;
        listeners.forEach(cb => cb(currentCity));
      }
    } catch {}
    return currentCity;
  },

  setCity: async (city: string) => {
    currentCity = city;
    try {
      await AsyncStorage.setItem('mytix_selected_city', city);
    } catch {}
    listeners.forEach(cb => cb(currentCity));
  },

  subscribe: (listener: LocationListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};
