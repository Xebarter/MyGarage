export type AddressSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  label: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  types?: string[];
};

export type PlaceDetails = {
  label: string;
  lat: number;
  lng: number;
};

export type SuggestionProvider = 'google' | 'osm';

export type AddressSuggestionsResult = {
  suggestions: AddressSuggestion[];
  provider: SuggestionProvider;
};

type AutocompleteOptions = {
  limit?: number;
  sessionToken?: string;
  origin?: { lat: number; lng: number };
};

type GoogleAutocompleteSuggestion = {
  placePrediction?: {
    placeId?: string;
    types?: string[];
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
};

type GooglePlaceDetails = {
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

type LegacyAutocompletePrediction = {
  place_id?: string;
  description?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  types?: string[];
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  importance?: number;
  type?: string;
  class?: string;
};

const KAMPALA_CENTER = { lat: 0.3476, lng: 32.5825 };
const NEARBY_BIAS_RADIUS_M = 35_000;
const DEFAULT_BIAS_RADIUS_M = 80_000;

export function getGoogleMapsApiKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    null
  );
}

function splitDisplayName(displayName: string): Pick<AddressSuggestion, 'title' | 'subtitle' | 'label'> {
  const parts = displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const title = parts[0] ?? displayName;
  const subtitle = parts.slice(1, 3).join(', ');
  return { title, subtitle, label: displayName };
}

function mapNominatimType(type?: string, klass?: string): string[] {
  if (type === 'house' || type === 'residential' || klass === 'highway') return ['street_address'];
  if (klass === 'shop' || klass === 'amenity') return ['establishment'];
  return ['geocode'];
}

function biasRadiusForOrigin(origin?: { lat: number; lng: number }): number {
  return origin ? NEARBY_BIAS_RADIUS_M : DEFAULT_BIAS_RADIUS_M;
}

function buildGoogleAutocompleteBody(query: string, options: AutocompleteOptions): Record<string, unknown> {
  const origin = options.origin ?? KAMPALA_CENTER;
  const body: Record<string, unknown> = {
    input: query,
    languageCode: 'en',
    regionCode: 'UG',
    includedRegionCodes: ['UG'],
    locationBias: {
      circle: {
        center: { latitude: origin.lat, longitude: origin.lng },
        radius: biasRadiusForOrigin(options.origin),
      },
    },
    origin: {
      latitude: origin.lat,
      longitude: origin.lng,
    },
  };

  if (options.sessionToken) {
    body.sessionToken = options.sessionToken;
  }

  return body;
}

function mapGooglePrediction(
  placeId: string,
  title: string,
  subtitle: string,
  types?: string[],
): AddressSuggestion {
  const label = [title, subtitle].filter(Boolean).join(', ');
  return {
    id: placeId,
    placeId,
    title,
    subtitle,
    label,
    types,
  };
}

async function fetchGoogleSuggestionsNew(
  query: string,
  options: AutocompleteOptions,
): Promise<AddressSuggestion[]> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return [];

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types,suggestions.placePrediction.text',
    },
    body: JSON.stringify(buildGoogleAutocompleteBody(query, options)),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    console.error('Google Places autocomplete (new) failed:', res.status, errorBody);
    return [];
  }

  const data = (await res.json()) as { suggestions?: GoogleAutocompleteSuggestion[] };
  const limit = options.limit ?? 6;

  return (data.suggestions ?? [])
    .map((entry) => {
      const prediction = entry.placePrediction;
      const placeId = prediction?.placeId?.trim();
      if (!placeId) return null;

      const title =
        prediction.structuredFormat?.mainText?.text?.trim() ||
        prediction.text?.text?.trim() ||
        '';
      const subtitle = prediction.structuredFormat?.secondaryText?.text?.trim() || '';
      if (!title) return null;

      return mapGooglePrediction(placeId, title, subtitle, prediction.types);
    })
    .filter((item): item is AddressSuggestion => item != null)
    .slice(0, limit);
}

async function fetchGoogleSuggestionsLegacy(
  query: string,
  options: AutocompleteOptions,
): Promise<AddressSuggestion[]> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return [];

  const origin = options.origin ?? KAMPALA_CENTER;
  const limit = options.limit ?? 6;
  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', query);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('components', 'country:ug');
  url.searchParams.set('language', 'en');
  url.searchParams.set('location', `${origin.lat},${origin.lng}`);
  url.searchParams.set('radius', String(biasRadiusForOrigin(options.origin)));
  url.searchParams.set('strictbounds', 'false');
  if (options.sessionToken) {
    url.searchParams.set('sessiontoken', options.sessionToken);
  }

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    console.error('Google Places autocomplete (legacy) failed:', res.status);
    return [];
  }

  const data = (await res.json()) as {
    status?: string;
    error_message?: string;
    predictions?: LegacyAutocompletePrediction[];
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('Google Places autocomplete (legacy) status:', data.status, data.error_message ?? '');
    return [];
  }

  return (data.predictions ?? [])
    .map((prediction) => {
      const placeId = prediction.place_id?.trim();
      if (!placeId) return null;

      const title =
        prediction.structured_formatting?.main_text?.trim() ||
        prediction.description?.trim() ||
        '';
      const subtitle = prediction.structured_formatting?.secondary_text?.trim() || '';
      if (!title) return null;

      return mapGooglePrediction(placeId, title, subtitle, prediction.types);
    })
    .filter((item): item is AddressSuggestion => item != null)
    .slice(0, limit);
}

async function fetchGoogleSuggestions(
  query: string,
  options: AutocompleteOptions,
): Promise<AddressSuggestion[]> {
  const limit = options.limit ?? 6;
  const withLimit = { ...options, limit };

  const fromNew = await fetchGoogleSuggestionsNew(query, withLimit);
  if (fromNew.length > 0) return fromNew;

  return fetchGoogleSuggestionsLegacy(query, withLimit);
}

async function fetchNominatimSuggestions(
  query: string,
  limit: number,
): Promise<AddressSuggestion[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'ug');

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      'User-Agent': 'MyGarage/1.0 (https://mygarage.ug; address autocomplete)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as NominatimResult[];
  return data
    .map((item) => {
      const lat = item.lat != null ? parseFloat(item.lat) : NaN;
      const lng = item.lon != null ? parseFloat(item.lon) : NaN;
      const displayName = typeof item.display_name === 'string' ? item.display_name.trim() : '';
      if (!displayName || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const formatted = splitDisplayName(displayName);
      return {
        id: `osm-${lat.toFixed(5)}-${lng.toFixed(5)}`,
        ...formatted,
        lat,
        lng,
        types: mapNominatimType(item.type, item.class),
        importance: item.importance ?? 0,
      };
    })
    .filter((item): item is AddressSuggestion & { importance: number } => item != null)
    .sort((a, b) => b.importance - a.importance)
    .map(({ importance: _importance, ...item }) => item);
}

export async function fetchAddressSuggestions(
  query: string,
  options: AutocompleteOptions = {},
): Promise<AddressSuggestionsResult> {
  const limit = Math.min(8, Math.max(1, options.limit ?? 6));
  const apiKey = getGoogleMapsApiKey();

  if (apiKey) {
    const google = await fetchGoogleSuggestions(query, { ...options, limit });
    if (google.length > 0) {
      return { suggestions: google, provider: 'google' };
    }
  }

  const osm = await fetchNominatimSuggestions(query, limit);
  return { suggestions: osm, provider: 'osm' };
}

async function fetchGooglePlaceDetailsNew(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetails | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;

  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken);

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'location,formattedAddress',
    },
  });

  if (!res.ok) {
    console.error('Google Place details (new) failed:', res.status, await res.text().catch(() => ''));
    return null;
  }

  const data = (await res.json()) as GooglePlaceDetails;
  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  const label = data.formattedAddress?.trim() || '';

  if (!label || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { label, lat, lng };
}

async function fetchGooglePlaceDetailsLegacy(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetails | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('fields', 'formatted_address,geometry');
  url.searchParams.set('language', 'en');
  if (sessionToken) url.searchParams.set('sessiontoken', sessionToken);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status?: string;
    error_message?: string;
    result?: {
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    };
  };

  if (data.status !== 'OK' || !data.result) {
    console.error('Google Place details (legacy) status:', data.status, data.error_message ?? '');
    return null;
  }

  const lat = data.result.geometry?.location?.lat;
  const lng = data.result.geometry?.location?.lng;
  const label = data.result.formatted_address?.trim() || '';

  if (!label || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { label, lat, lng };
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetails> {
  if (!getGoogleMapsApiKey()) throw new Error('Places API is not configured');

  const fromNew = await fetchGooglePlaceDetailsNew(placeId, sessionToken);
  if (fromNew) return fromNew;

  const fromLegacy = await fetchGooglePlaceDetailsLegacy(placeId, sessionToken);
  if (fromLegacy) return fromLegacy;

  throw new Error('Could not resolve this place');
}
