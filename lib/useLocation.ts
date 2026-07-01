import { useState } from 'react';
import * as Location from 'expo-location';

export type DetectedLocation = { city: string | null; country: string | null };

const SCOTLAND_PREFIXES = new Set(['AB','DD','DG','EH','FK','G','HS','IV','KA','KW','KY','ML','PA','PH','TD','ZE']);
const WALES_PREFIXES    = new Set(['CF','LD','LL','NP','SA']);

function ukNationFromPostcode(postcode: string | null | undefined): string {
  const prefix = (postcode ?? '').toUpperCase().match(/^([A-Z]{1,2})/)?.[1] ?? '';
  if (prefix === 'BT') return 'Northern Ireland';
  if (SCOTLAND_PREFIXES.has(prefix)) return 'Scotland';
  if (WALES_PREFIXES.has(prefix)) return 'Wales';
  return 'England';
}

function resolveCountry(place: Location.LocationGeocodedAddress): string | null {
  const raw = place.country ?? null;
  if (!raw) return null;
  if (place.isoCountryCode === 'GB' || raw === 'United Kingdom') {
    return ukNationFromPostcode(place.postalCode);
  }
  return raw;
}

export function useDetectCity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function detectLocation(): Promise<DetectedLocation | null> {
    setError(null);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to verify your city.');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const city = place?.city ?? place?.subregion ?? place?.region ?? null;
      const country = place ? resolveCountry(place) : null;

      if (!city || !country) {
        setError('Could not determine your city. Make sure GPS is on and try again.');
        return null;
      }

      return { city, country };
    } catch (err: any) {
      setError(err.message ?? 'Could not detect location');
      return null;
    } finally {
      setLoading(false);
    }
  }

  // Fallback for when GPS isn't available (denied permission, web browser, no
  // signal indoors, etc.): the player types a place name (eg. "near Glasgow")
  // and we forward-geocode it to coordinates, then reverse-geocode those
  // coordinates the same way detectLocation() does — so the result is always
  // a real, normalized city/country name, never arbitrary free text.
  async function resolveFromText(query: string): Promise<DetectedLocation | null> {
    setError(null);
    setLoading(true);
    try {
      const trimmed = query.trim();
      if (!trimmed) {
        setError('Type a place name first.');
        return null;
      }

      const results = await Location.geocodeAsync(trimmed);
      const match = results[0];
      if (!match) {
        setError('Could not find that place. Try a nearby city name.');
        return null;
      }

      const [place] = await Location.reverseGeocodeAsync({
        latitude: match.latitude,
        longitude: match.longitude,
      });

      const city = place?.city ?? place?.subregion ?? place?.region ?? null;
      const country = place ? resolveCountry(place) : null;

      if (!city || !country) {
        setError('Could not match that to a city. Try a different name.');
        return null;
      }

      return { city, country };
    } catch (err: any) {
      setError(err.message ?? 'Could not resolve that location');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { detectLocation, resolveFromText, loading, error };
}
