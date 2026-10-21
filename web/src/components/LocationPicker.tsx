import type L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import { DEFAULT_ICON, MAX_BOUNDS, OSM_ATTRIBUTION, OSM_TILES } from '../lib/leaflet.ts'
import { roundCoordinate } from '../lib/region.ts'

export interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (latitude: number, longitude: number) => void
  /** Where the map opens when there is no location yet. */
  fallback: { latitude: number; longitude: number }
  /** An optional counter/key that triggers an explicit flyTo to [latitude, longitude] when changed. */
  recenterKey?: number | string
}

function ClickToPlace({ onChange }: { onChange: LocationPickerProps['onChange'] }) {
  useMapEvents({
    click: (event) => onChange(roundCoordinate(event.latlng.lat), roundCoordinate(event.latlng.lng)),
  })
  return null
}

function RecenterOnSignal({
  latitude,
  longitude,
  recenterKey,
}: {
  latitude: number | null
  longitude: number | null
  recenterKey?: number | string
}) {
  const map = useMap()
  const isFirstRun = useRef(true)

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (latitude !== null && longitude !== null && recenterKey !== undefined) {
      map.flyTo([latitude, longitude], 16, { duration: 1 })
    }
  }, [map, latitude, longitude, recenterKey])

  return null
}

/** Follows the marker when the coordinates are typed in the form or first set. */
function FollowLocation({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const map = useMap()
  const wasNull = useRef(true)

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      if (wasNull.current) {
        wasNull.current = false
        map.flyTo([latitude, longitude], 16, { duration: 1 })
      } else if (!map.getBounds().contains([latitude, longitude])) {
        map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15), { duration: 1 })
      }
    } else {
      wasNull.current = true
    }
  }, [map, latitude, longitude])

  return null
}



/**
 * Small map to mark a point's location: click or drag the marker. Mouse and touch only,
 * integrated with address search so typing an address automatically places the pin.
 */
export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  fallback,
  recenterKey,
}: LocationPickerProps) {
  const hasLocation = latitude !== null && longitude !== null
  const eventHandlers = useMemo(
    () => ({
      dragend: (event: L.DragEndEvent) => {
        const position = (event.target as L.Marker).getLatLng()
        onChange(roundCoordinate(position.lat), roundCoordinate(position.lng))
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
      <RecenterOnSignal latitude={latitude} longitude={longitude} recenterKey={recenterKey} />
      {hasLocation && (
        <Marker position={[latitude, longitude]} icon={DEFAULT_ICON} draggable keyboard={false} eventHandlers={eventHandlers} />
      )}
    </MapContainer>
  )
}
