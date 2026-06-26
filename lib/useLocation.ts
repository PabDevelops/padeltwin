import { useState } from 'react';
import * as Location from 'expo-location';

export function useDetectCity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function detectCity(): Promise<string | null> {
    setError(null);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      return place?.city ?? place?.subregion ?? place?.region ?? null;
    } catch (err: any) {
      setError(err.message ?? 'Could not detect location');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { detectCity, loading, error };
}
