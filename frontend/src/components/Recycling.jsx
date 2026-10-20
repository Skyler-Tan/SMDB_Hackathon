import { useState, useEffect } from 'react';
import {
  Droplet,
  Factory,
  CheckCircle,
  Plus,
  Minus,
  Recycle as RecycleIcon,
  Award,
  MapPin,
  Navigation,
  Loader2,
} from 'lucide-react';
import { scanApi, recycleApi, mapApi } from '../api/api';

const MAX_PLACES = 5;

// The backend response shape for /places/recycling is not fixed, so every
// helper below reads the common field names defensively.

// Returns the first non-empty value found at any of the (dotted) key paths.
const pick = (obj, keys) => {
  for (const key of keys) {
    const value = key
      .split('.')
      .reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Finds the list of places wherever the backend put it:
// [...], { places: [...] }, { results: [...] }, { data: { items: [...] } },
// GeoJSON { features: [...] }, etc.
function extractPlaces(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];

  const containers = [
    'places',
    'results',
    'items',
    'locations',
    'features',
    'data',
    'content',
  ];

  for (const key of containers) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = extractPlaces(value);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

// Straight-line distance in km between two coordinates.
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function normalizePlace(place, index, origin) {
  // Supports GeoJSON-style { properties: {...}, geometry: {...} } too.
  const source = { ...(place.properties || {}), ...place };

  let lat = toNumber(
    pick(source, [
      'latitude',
      'lat',
      'location.lat',
      'location.latitude',
      'geometry.location.lat',
      'coordinates.lat',
      'coordinates.latitude',
      'position.lat',
    ])
  );
  let lng = toNumber(
    pick(source, [
      'longitude',
      'lng',
      'lon',
      'long',
      'location.lng',
      'location.lon',
      'location.longitude',
      'geometry.location.lng',
      'coordinates.lng',
      'coordinates.longitude',
      'position.lng',
    ])
  );

  // GeoJSON stores coordinates as [lng, lat].
  const coords = place.geometry?.coordinates;
  if ((lat === null || lng === null) && Array.isArray(coords)) {
    lng = toNumber(coords[0]);
    lat = toNumber(coords[1]);
  }

  // A "lat,lng" string.
  if ((lat === null || lng === null) && typeof source.location === 'string') {
    const [a, b] = source.location.split(',').map((part) => toNumber(part));
    if (a !== null && b !== null) {
      lat = a;
      lng = b;
    }
  }

  // Distance: work it out ourselves from the user's real position whenever the
  // place has coordinates (the API's own distance can use another unit or
  // starting point). Only fall back to the API's number without coordinates.
  let distanceKm = null;

  if (lat !== null && lng !== null && origin) {
    distanceKm = haversineKm(origin.lat, origin.lng, lat, lng);
  }

  if (distanceKm === null) {
    distanceKm = toNumber(pick(source, ['distanceKm', 'distance_km']));
  }

  if (distanceKm === null) {
    const meters = toNumber(
      pick(source, ['distanceMeters', 'distance_meters', 'distanceM', 'distance_m'])
    );
    if (meters !== null) distanceKm = meters / 1000;
  }

  if (distanceKm === null) {
    const generic = toNumber(source.distance);
    // A bare "distance" is ambiguous: values over 200 are almost certainly metres.
    if (generic !== null) distanceKm = generic > 200 ? generic / 1000 : generic;
  }

  const openRaw = pick(source, [
    'openNow',
    'open_now',
    'isOpen',
    'open',
    'opening_hours.open_now',
    'openingHours.openNow',
    'currentOpeningHours.openNow',
  ]);

  return {
    id: String(
      pick(source, ['id', 'placeId', 'place_id', 'uuid']) ?? `place-${index}`
    ),
    name: String(
      pick(source, [
        'name',
        'displayName.text',
        'displayName',
        'title',
        'placeName',
        'label',
      ]) ?? 'Recycling point'
    ),
    address: String(
      pick(source, [
        'address',
        'vicinity',
        'formattedAddress',
        'formatted_address',
        'fullAddress',
        'street',
        'description',
      ]) ?? ''
    ),
    lat,
    lng,
    distanceKm,
    openNow: typeof openRaw === 'boolean' ? openRaw : undefined,
  };
}

function directionsUrl(place) {
  if (place.lat !== null && place.lng !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  }
  const query = encodeURIComponent(`${place.name} ${place.address}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function NearbyRecyclingLocations({ material }) {
  const [status, setStatus] = useState('idle'); // idle | locating | loading | done
  const [places, setPlaces] = useState([]);
  const [message, setMessage] = useState('');
  const [accuracyKm, setAccuracyKm] = useState(null);

  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${material ? material + ' ' : ''}recycling centre near me`
  )}`;

  const findLocations = () => {
    if (!('geolocation' in navigator)) {
      setMessage('Your browser does not support location detection.');
      return;
    }

    setStatus('locating');
    setMessage('');
    setPlaces([]);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setStatus('loading');

        const origin = { lat: coords.latitude, lng: coords.longitude };
        setAccuracyKm(
          Number.isFinite(coords.accuracy) ? coords.accuracy / 1000 : null
        );

        try {
          let response = await mapApi.findNearby(
            origin.lat,
            origin.lng,
            material || ''
          );
          let list = extractPlaces(response?.data);
          let relaxed = false;

          // Nothing for this specific material? Retry without the filter.
          if (list.length === 0 && material) {
            response = await mapApi.findNearby(origin.lat, origin.lng, '');
            list = extractPlaces(response?.data);
            relaxed = list.length > 0;
          }

          const normalized = list
            .filter((item) => item && typeof item === 'object')
            .map((item, index) => normalizePlace(item, index, origin))
            .sort((a, b) => {
              if (a.distanceKm === null) return 1;
              if (b.distanceKm === null) return -1;
              return a.distanceKm - b.distanceKm;
            })
            .slice(0, MAX_PLACES);

          setPlaces(normalized);

          if (normalized.length === 0) {
            setMessage('No recycling locations were found near you.');
          } else if (relaxed) {
            setMessage(
              `No locations found specifically for ${material}. Showing general recycling points nearby.`
            );
          }
        } catch (err) {
          console.error('Failed to load nearby recycling locations:', err);
          setMessage(
            'Could not load nearby locations. Check that your backend is running.'
          );
        } finally {
          setStatus('done');
        }
      },
      (err) => {
        console.error('Geolocation failed:', err);
        const messages = {
          1: 'Location permission was denied. Allow it in your browser settings and try again.',
          2: 'Could not determine your location.',
          3: 'Finding your location took too long. Please try again.',
        };
        setMessage(messages[err.code] || 'Could not get your location.');
        setStatus('done');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const busy = status === 'locating' || status === 'loading';

  return (
    <div className="mb-6 rounded-xl border border-gray-200 p-4">
      <div className="mb-3 flex items-center gap-2">
        <MapPin size={20} className="text-green-600" />
        <h4 className="font-semibold text-gray-900">
          Find a recycling location
        </h4>
      </div>

      <button
        type="button"
        onClick={findLocations}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-600 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Navigation size={16} />
        )}
        {status === 'locating'
          ? 'Getting your location...'
          : status === 'loading'
            ? 'Searching nearby...'
            : places.length > 0
              ? 'Search again'
              : 'Find drop-off points near me'}
      </button>

      {message && (
        <p role="status" className="mt-3 text-sm text-gray-600">
          {message}
        </p>
      )}

      {places.length > 0 && (
        <ul className="mt-3 space-y-2">
          {places.map((place) => (
            <li
              key={place.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">
                  {place.name}
                </p>
                {place.address && (
                  <p className="text-xs text-gray-500">{place.address}</p>
                )}
                <p className="mt-1 text-xs font-medium text-gray-600">
                  {place.distanceKm !== null &&
                    `~${place.distanceKm.toFixed(1)} km away`}
                  {place.distanceKm !== null &&
                    typeof place.openNow === 'boolean' &&
                    ' · '}
                  {typeof place.openNow === 'boolean' && (
                    <span
                      className={
                        place.openNow ? 'text-green-700' : 'text-red-600'
                      }
                    >
                      {place.openNow ? 'Open now' : 'Closed'}
                    </span>
                  )}
                </p>
              </div>

              <a
                href={directionsUrl(place)}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
              >
                Directions
              </a>
            </li>
          ))}
        </ul>
      )}

      {places.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Distances are straight-line, so the road distance will be longer.
          {accuracyKm !== null && accuracyKm > 1
            ? ` Your detected location is only accurate to about ${accuracyKm.toFixed(
                1
              )} km, so these distances may be off. Try on a phone with GPS for better results.`
            : ''}
        </p>
      )}

      {status === 'done' && places.length === 0 && (
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-medium text-green-700 underline"
        >
          Search recycling centres in Google Maps
        </a>
      )}
    </div>
  );
}

export default function Recycling({
  itemId,
  userId,
  onClose,
  onRecycled,
}) {
  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recycling, setRecycling] = useState(false);
  const [recycleResult, setRecycleResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRecyclingInfo() {
      setLoading(true);
      setError('');

      if (!itemId) {
        setError('Item ID is missing. Please scan or select an item again.');
        setLoading(false);
        return;
      }

      try {
        const response = await scanApi.loadRecycling(itemId);

        if (active) {
          setData(response.data);
        }
      } catch (err) {
        console.error('Failed to load recycling information:', err);

        if (active) {
          setError(
            err.response?.data?.message ||
              'Could not load recycling information. Check your backend connection and try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecyclingInfo();

    return () => {
      active = false;
    };
  }, [itemId]);

  const itemName = data?.name || 'Recyclable item';
  const material = data?.material || '';
  const waterLiters = Number(data?.waterLiters ?? 0);
  const co2Kg = Number(data?.co2Kg ?? 0);
  const materialGrams = Number(data?.materialGrams ?? 0);
  const rewardPoints = Number(data?.rewardPoints ?? 0);
  const recyclable = data?.recyclable;

  const pointsToEarn = rewardPoints * quantity;

  const handleConfirmRecycle = async () => {
    if (recycling) return;

    if (!itemId) {
      setError('Missing item ID. Please scan the item again.');
      return;
    }

    if (!userId) {
      setError('User ID is missing. Please log in again before recycling.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    if (recyclable === false) {
      setError(
        'This item is not marked as recyclable. Recycling was not submitted.'
      );
      return;
    }

    setRecycling(true);
    setError('');

    try {
      const response = await recycleApi.recycle({
        itemId,
        userId,
        quantity,
      });

      const result = response?.data;

      if (!result || typeof result !== 'object') {
        throw new Error('The server returned an invalid recycling response.');
      }

      // Use the actual reward returned by the backend.
      // The calculated preview is only a fallback for older APIs.
      const pointsEarned = Number(result.pointsThisTurn ?? pointsToEarn);

      const normalizedResult = {
        ...result,
        itemName: result.itemName || itemName,
        pointsThisTurn: pointsEarned,
        waterLitersThisTurn: Number(
          result.waterLitersThisTurn ?? waterLiters * quantity
        ),
        co2KgThisTurn: Number(result.co2KgThisTurn ?? co2Kg * quantity),
        newBadges: Array.isArray(result.newBadges) ? result.newBadges : [],
      };

      setRecycleResult(normalizedResult);

      // Refresh parent statistics only after success.
      if (onRecycled) {
        try {
          await onRecycled(normalizedResult);
        } catch (refreshError) {
          // Recycling succeeded; do not show it as failed
          // just because refreshing the profile failed.
          console.error('Could not refresh profile statistics:', refreshError);
        }
      }
    } catch (err) {
      console.error('Recycle request failed:', {
        message: err.message,
        status: err.response?.status,
        response: err.response?.data,
        itemId,
        userId,
      });

      const serverMessage =
        err.response?.data?.message ||
        (typeof err.response?.data === 'string' ? err.response.data : null);

      let message =
        serverMessage ||
        err.message ||
        'Failed to record recycling. Please try again.';

      if (!err.response) {
        message =
          'Cannot reach the recycling server. Check that your backend is running and your API URL is correct.';
      } else if (err.response.status === 400) {
        message =
          serverMessage ||
          'Invalid recycling request. Check the item ID, user ID, and quantity.';
      } else if (
        err.response.status === 401 ||
        err.response.status === 403
      ) {
        message =
          'You are not authorized to recycle this item. Please log in again.';
      } else if (err.response.status === 404) {
        message =
          'The recycling endpoint or item was not found. Check your API URL and backend route.';
      }

      setError(message);
    } finally {
      setRecycling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        Loading recycling information...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-lg">
        <p className="text-center text-red-600">
          {error || 'Failed to load recycling information.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-gray-200 py-3 font-semibold"
        >
          Back
        </button>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (recycleResult) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-6 text-center">
          <CheckCircle className="mx-auto mb-3 text-green-500" size={56} />
          <h3 className="text-2xl font-bold text-green-700">
            Recycled Successfully!
          </h3>
          <p className="mt-1 text-gray-600">{recycleResult.itemName}</p>
          <p className="mt-1 text-sm text-gray-500">Quantity: {quantity}</p>
        </div>

        <div className="mb-6 rounded-xl bg-green-50 p-5 text-center">
          <Award size={32} className="mx-auto mb-2 text-yellow-500" />
          <p className="text-sm font-medium text-green-700">
            Eco points earned
          </p>
          <p className="text-4xl font-extrabold text-green-700">
            +{recycleResult.pointsThisTurn}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Keep recycling to unlock your next badge!
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-blue-50 p-4">
            <Droplet size={22} className="mx-auto mb-2 text-blue-500" />
            <p className="font-bold text-blue-700">
              {recycleResult.waterLitersThisTurn.toFixed(1)} L
            </p>
            <p className="text-xs text-gray-500">Water saved</p>
          </div>

          <div className="rounded-lg bg-green-50 p-4">
            <RecycleIcon size={22} className="mx-auto mb-2 text-green-600" />
            <p className="font-bold text-green-700">
              {recycleResult.co2KgThisTurn.toFixed(2)} kg
            </p>
            <p className="text-xs text-gray-500">CO₂ reduced</p>
          </div>
        </div>

        {recycleResult.newBadges.length > 0 && (
          <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
            <h4 className="mb-3 font-bold text-purple-800">
              🏆 New badges unlocked!
            </h4>
            <div className="flex flex-wrap gap-2">
              {recycleResult.newBadges.map((badge, index) => {
                const name =
                  typeof badge === 'string'
                    ? badge
                    : badge.name || badge.title || 'Eco Badge';

                return (
                  <span
                    key={`${name}-${index}`}
                    className="rounded-full bg-purple-200 px-3 py-1 text-sm font-semibold text-purple-800"
                  >
                    🏅 {name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <NearbyRecyclingLocations material={material} />

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-lg">
      <h3 className="mb-4 text-xl font-bold">Recycling Impact</h3>

      <div className="mb-6">
        <p className="text-lg font-semibold">{itemName}</p>
        <p className="text-sm text-gray-600">How many are you recycling?</p>
      </div>

      {/* QUANTITY */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          disabled={recycling || quantity <= 1}
          aria-label="Decrease quantity"
          className="rounded-lg bg-gray-200 p-3 hover:bg-gray-300 disabled:opacity-40"
        >
          <Minus size={20} />
        </button>

        <span className="flex flex-1 items-center justify-center text-2xl font-bold">
          {quantity}
        </span>

        <button
          type="button"
          onClick={() => setQuantity((current) => Math.min(100, current + 1))}
          disabled={recycling || quantity >= 100}
          aria-label="Increase quantity"
          className="rounded-lg bg-gray-200 p-3 hover:bg-gray-300 disabled:opacity-40"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* WATER SAVED */}
      <div className="mb-6">
        <h4 className="mb-3 font-semibold text-blue-600">Water Saved</h4>
        <div className="flex items-center gap-4 rounded-lg bg-blue-50 p-5">
          <div className="flex gap-1">
            {Array.from({
              length: Math.min(
                5,
                Math.max(0, Math.ceil((waterLiters * quantity) / 10))
              ),
            }).map((_, index) => (
              <Droplet key={index} className="text-blue-500" size={23} />
            ))}
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {(waterLiters * quantity).toFixed(1)} L
          </p>
        </div>
      </div>

      {/* CO2 */}
      <div className="mb-6">
        <h4 className="mb-3 font-semibold text-gray-600">
          Pollution / Greenhouse Gases
        </h4>
        <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-5">
          <span className="text-3xl">💨</span>
          <div>
            <p className="text-sm text-gray-600">CO₂ reduced</p>
            <p className="text-2xl font-bold text-green-800">
              {(co2Kg * quantity).toFixed(2)} kg
            </p>
          </div>
        </div>
      </div>

      {/* MATERIAL */}
      <div className="mb-6 flex items-center gap-4 rounded-lg bg-green-50 p-4">
        <Factory className="text-green-600" size={32} />
        <div>
          <p className="text-sm text-gray-600">Materials saved</p>
          <p className="text-xl font-bold text-green-800">
            {((materialGrams * quantity) / 1000).toFixed(2)} kg
          </p>
        </div>
      </div>

      {/* POINTS PREVIEW */}
      <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-green-800">Points to earn</span>
          <span className="text-2xl font-extrabold text-green-700">
            +{pointsToEarn}
          </span>
        </div>
        <p className="mt-2 text-xs text-green-700">
          {rewardPoints} points per item × {quantity} item(s). Final points are
          confirmed by the server.
        </p>
      </div>

      {/* NEARBY RECYCLING LOCATIONS */}
      <div className="mt-6">
        <NearbyRecyclingLocations material={material} />
      </div>

      {recyclable === false && (
        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          This item is marked as non-recyclable. You cannot confirm recycling
          for this item.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleConfirmRecycle}
          disabled={recycling || recyclable === false}
          className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {recycling ? 'Recording...' : 'Confirm Recycle'}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={recycling}
          className="rounded-lg bg-gray-200 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}