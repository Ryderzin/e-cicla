import type L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import { DEFAULT_ICON, MAX_BOUNDS, OSM_ATTRIBUTION, OSM_TILES } from '../lib/leaflet.ts'

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (latitude: number, longitude: number) => void
  /** Where the map opens when there is no location yet. */
  fallback: { latitude: number; longitude: number }
}

function ClickToPlace({ onChange }: { onChange: LocationPickerProps['onChange'] }) {
  useMapEvents({
    click: (event) => onChange(round(event.latlng.lat), round(event.latlng.lng)),
  })
  return null
}

/** Follows the marker when the coordinates are typed in the form. */
function FollowLocation({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (latitude !== null && longitude !== null && !map.getBounds().contains([latitude, longitude])) {
      map.panTo([latitude, longitude])
    }
  }, [map, latitude, longitude])
  return null
}

// About 1 m of precision is plenty to find a collection point.
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/**
 * Small map to mark a point's location: click or drag the marker. Mouse and touch only, so the form
 * also has latitude and longitude fields for keyboard users.
 */
export default function LocationPicker({ latitude, longitude, onChange, fallback }: LocationPickerProps) {
  const hasLocation = latitude !== null && longitude !== null
  const eventHandlers = useMemo(
    () => ({
      dragend: (event: L.DragEndEvent) => {
        const position = (event.target as L.Marker).getLatLng()
        onChange(round(position.lat), round(position.lng))
      },
    }),
    [onChange],
  )
  return (
    <MapContainer
      center={hasLocation ? [latitude, longitude] : [fallback.latitude, fallback.longitude]}
      zoom={hasLocation ? 16 : 12}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={1}
      keyboard={false}
      className="h-72 w-full rounded-xl border border-slate-300"
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILES} />
      <ClickToPlace onChange={onChange} />
      <FollowLocation latitude={latitude} longitude={longitude} />
      {hasLocation && (
        <Marker position={[latitude, longitude]} icon={DEFAULT_ICON} draggable keyboard={false} eventHandlers={eventHandlers} />
      )}
    </MapContainer>
  )
}
