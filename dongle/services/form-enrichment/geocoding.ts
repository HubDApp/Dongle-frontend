/**
 * Geocoding Service for Form Data Enrichment
 * Translates address and location strings to geocoded coordinates, timezones, and structured metadata.
 */

import type { GeocodeResult } from "./types";

interface CityRecord {
  city: string;
  country: string;
  countryCode: string;
  stateOrRegion: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// Global tech and Web3 hub directory
const GLOBAL_LOCATIONS: Record<string, CityRecord> = {
  "san francisco": {
    city: "San Francisco",
    country: "United States",
    countryCode: "US",
    stateOrRegion: "California",
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: "America/Los_Angeles",
  },
  "new york": {
    city: "New York",
    country: "United States",
    countryCode: "US",
    stateOrRegion: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
  },
  london: {
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    stateOrRegion: "England",
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: "Europe/London",
  },
  berlin: {
    city: "Berlin",
    country: "Germany",
    countryCode: "DE",
    stateOrRegion: "Berlin",
    latitude: 52.52,
    longitude: 13.405,
    timezone: "Europe/Berlin",
  },
  singapore: {
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    stateOrRegion: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: "Asia/Singapore",
  },
  tokyo: {
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    stateOrRegion: "Kanto",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
  },
  zurich: {
    city: "Zurich",
    country: "Switzerland",
    countryCode: "CH",
    stateOrRegion: "Zurich",
    latitude: 47.3769,
    longitude: 8.5417,
    timezone: "Europe/Zurich",
  },
  zug: {
    city: "Zug",
    country: "Switzerland",
    countryCode: "CH",
    stateOrRegion: "Zug",
    latitude: 47.1662,
    longitude: 8.5155,
    timezone: "Europe/Zurich",
  },
  paris: {
    city: "Paris",
    country: "France",
    countryCode: "FR",
    stateOrRegion: "Île-de-France",
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: "Europe/Paris",
  },
  lagos: {
    city: "Lagos",
    country: "Nigeria",
    countryCode: "NG",
    stateOrRegion: "Lagos",
    latitude: 6.5244,
    longitude: 3.3792,
    timezone: "Africa/Lagos",
  },
  toronto: {
    city: "Toronto",
    country: "Canada",
    countryCode: "CA",
    stateOrRegion: "Ontario",
    latitude: 43.6532,
    longitude: -79.3832,
    timezone: "America/Toronto",
  },
  sydney: {
    city: "Sydney",
    country: "Australia",
    countryCode: "AU",
    stateOrRegion: "New South Wales",
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: "Australia/Sydney",
  },
  seoul: {
    city: "Seoul",
    country: "South Korea",
    countryCode: "KR",
    stateOrRegion: "Seoul",
    latitude: 37.5665,
    longitude: 126.978,
    timezone: "Asia/Seoul",
  },
  austin: {
    city: "Austin",
    country: "United States",
    countryCode: "US",
    stateOrRegion: "Texas",
    latitude: 30.2672,
    longitude: -97.7431,
    timezone: "America/Chicago",
  },
  dubai: {
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    stateOrRegion: "Dubai",
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: "Asia/Dubai",
  },
  amsterdam: {
    city: "Amsterdam",
    country: "Netherlands",
    countryCode: "NL",
    stateOrRegion: "North Holland",
    latitude: 52.3676,
    longitude: 4.9041,
    timezone: "Europe/Amsterdam",
  },
  nairobi: {
    city: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
    stateOrRegion: "Nairobi",
    latitude: -1.2921,
    longitude: 36.8219,
    timezone: "Africa/Nairobi",
  },
  "buenos aires": {
    city: "Buenos Aires",
    country: "Argentina",
    countryCode: "AR",
    stateOrRegion: "Buenos Aires",
    latitude: -34.6037,
    longitude: -58.3816,
    timezone: "America/Argentina/Buenos_Aires",
  },
};

/**
 * Geocode an address or location query string
 */
export async function geocodeAddress(
  addressInput?: string | null,
): Promise<GeocodeResult | null> {
  if (!addressInput || addressInput.trim().length === 0) {
    return null;
  }

  const query = addressInput.trim().toLowerCase();

  // 1. Direct match or substring match against known hubs
  for (const [key, record] of Object.entries(GLOBAL_LOCATIONS)) {
    if (query.includes(key) || key.includes(query)) {
      return {
        formattedAddress: `${record.city}, ${record.stateOrRegion}, ${record.country}`,
        latitude: record.latitude,
        longitude: record.longitude,
        country: record.country,
        countryCode: record.countryCode,
        city: record.city,
        stateOrRegion: record.stateOrRegion,
        timezone: record.timezone,
        confidence: 0.95,
        source: "city_lookup",
      };
    }
  }

  // 2. Check for country names or country codes
  if (query.includes("usa") || query.includes("united states") || query.includes("us")) {
    return {
      formattedAddress: "United States",
      latitude: 37.0902,
      longitude: -95.7129,
      country: "United States",
      countryCode: "US",
      city: "San Francisco",
      stateOrRegion: "California",
      timezone: "America/New_York",
      confidence: 0.8,
      source: "country_lookup",
    };
  }

  if (query.includes("uk") || query.includes("united kingdom") || query.includes("england")) {
    return {
      formattedAddress: "United Kingdom",
      latitude: 55.3781,
      longitude: -3.436,
      country: "United Kingdom",
      countryCode: "GB",
      city: "London",
      stateOrRegion: "England",
      timezone: "Europe/London",
      confidence: 0.8,
      source: "country_lookup",
    };
  }

  if (query.includes("germany") || query.includes("deutschland")) {
    return {
      formattedAddress: "Germany",
      latitude: 51.1657,
      longitude: 10.4515,
      country: "Germany",
      countryCode: "DE",
      city: "Berlin",
      stateOrRegion: "Berlin",
      timezone: "Europe/Berlin",
    confidence: 0.8,
      source: "country_lookup",
    };
  }

  // 3. Fallback generic geocoding parsing (extracts comma-separated tokens)
  const parts = addressInput.split(",").map((p) => p.trim());
  const fallbackCity = parts[0] || "Global";
  const fallbackCountry = parts[parts.length - 1] || "Global";

  return {
    formattedAddress: addressInput.trim(),
    latitude: 0,
    longitude: 0,
    country: fallbackCountry,
    countryCode: "GLOBAL",
    city: fallbackCity,
    stateOrRegion: parts[1] || fallbackCity,
    timezone: "UTC",
    confidence: 0.5,
    source: "fallback",
  };
}

/**
 * Reverse geocode coordinates to approximate location
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodeResult> {
  // Find nearest city from known directory
  let minDistance = Infinity;
  let nearestCity = GLOBAL_LOCATIONS["san francisco"];

  for (const record of Object.values(GLOBAL_LOCATIONS)) {
    const dLat = record.latitude - lat;
    const dLng = record.longitude - lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = record;
    }
  }

  return {
    formattedAddress: `${nearestCity.city}, ${nearestCity.stateOrRegion}, ${nearestCity.country}`,
    latitude: lat,
    longitude: lng,
    country: nearestCity.country,
    countryCode: nearestCity.countryCode,
    city: nearestCity.city,
    stateOrRegion: nearestCity.stateOrRegion,
    timezone: nearestCity.timezone,
    confidence: Math.max(0.3, 1 - minDistance / 100),
    source: "direct",
  };
}
