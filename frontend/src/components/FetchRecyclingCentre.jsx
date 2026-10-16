import { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, RefreshCw, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { mapApi } from '../api/api';

// Leaflet's default marker icons break with bundlers (Vite/Webpack), so set them explicitly
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Green icon for the selected place
const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const formatDistance = (m) =>
  m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

// Zooms the map to fit the user + all places
function FitBounds({ userPos, places }) {
  const map = useMap();
  useEffect(() => {
    const points = [[userPos.lat, userPos.lng], ...places.map((p) => [p.lat, p.lng])];
    if (points.length > 1) {
      map.fitBounds(points, { padding: [30, 30], maxZoom: 16 });
    } else {
      map.setView(points[0], 14);
    }
  }, [map, userPos, places]);
  return null;
}

// Flies to the selected place
function FlyToSelected({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place) map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [map, place]);
  return null;
}

export default function FetchRecyclingCentre({ material = '' }) {
  const [places, setPlaces] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setPlaces([]);
    setSelectedKey(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          setUserPos({ lat: coords.latitude, lng: coords.longitude });
          const response = await mapApi.findNearby(
            coords.latitude,
            coords.longitude,
            material
          );
          const results = (response.data ?? [])
            .slice()
            .sort((a, b) => a.distanceMeters - b.distanceMeters)
            .map((p, i) => ({ ...p, key: `${p.osmType}-${p.osmId}-${i}` }));
          setPlaces(results);
        } catch (err) {
          const msg =
            err.response?.data?.message ||
            err.response?.data ||
            err.message ||
            'Failed to fetch nearby centres.';
          setError(typeof msg === 'string' ? msg : 'Failed to fetch nearby centres.');
        } finally {
          setLoading(false);
        }
      },
      (geoErr) => {
        setError(
          geoErr.code === 1
            ? 'Location permission denied. Please allow location access and try again.'
            : 'Unable to get your location. Please try again.'
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [material]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPlace = places.find((p) => p.key === selectedKey) ?? null;

  // Clicking a marker selects it and scrolls its card into view
  const handleMarkerClick = (key) => {
    setSelectedKey(key);
    document
      .getElementById(`place-${key}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="animate-spin mx-auto mb-3 w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
        <p className="text-gray-600">Finding nearby recycling centres...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 items-start mb-4">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
        <button
          onClick={load}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition"
        >
          <RefreshCw size={18} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Nearby Recycling Centres</h2>
        <button
          onClick={load}
          title="Refresh"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Map view */}
      {userPos && (
        <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <MapContainer
            center={[userPos.lat, userPos.lng]}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: '280px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds userPos={userPos} places={places} />
            <FlyToSelected place={selectedPlace} />

            {/* User location */}
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={8}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
            >
              <Popup>You are here</Popup>
            </CircleMarker>

            {/* Recycling centres */}
            {places.map((place) => (
              <Marker
                key={place.key}
                position={[place.lat, place.lng]}
                icon={place.key === selectedKey ? selectedIcon : new L.Icon.Default()}
                eventHandlers={{ click: () => handleMarkerClick(place.key) }}
              >
                <Popup>
                  <strong>{place.name}</strong>
                  <br />
                  {formatDistance(place.distanceMeters)} away
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {places.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <MapPin className="mx-auto text-gray-400 mb-3" size={32} />
          <p className="text-gray-600 font-medium">No recycling centres found</p>
          <p className="text-sm text-gray-500 mt-1">None found within 10 km of your location.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {places.length} {places.length === 1 ? 'centre' : 'centres'} found within 10 km
          </p>
          <div className="space-y-3">
            {places.map((place) => {
              const selected = place.key === selectedKey;
              return (
                <div
                  key={place.key}
                  id={`place-${place.key}`}
                  onClick={() => setSelectedKey(place.key)}
                  className={`rounded-lg p-4 border shadow-sm cursor-pointer transition ${
                    selected
                      ? 'bg-green-50 border-green-600'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <MapPin className="text-green-600 shrink-0 mt-0.5" size={16} />
                      <p className="font-semibold text-gray-900 truncate">{place.name}</p>
                    </div>
                    <span className="text-green-600 font-semibold text-sm whitespace-nowrap">
                      {formatDistance(place.distanceMeters)}
                    </span>
                  </div>

                  {place.address && (
                    <p className="text-sm text-gray-500 ml-6 mb-3 line-clamp-2">
                      {place.address}
                    </p>
                  )}

                  <a
                    href={place.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-6 inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition"
                  >
                    <Navigation size={14} />
                    Get Directions
                  </a>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
