import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'

import type { PointSummary } from '../api/points.ts'
import { UNNAMED_POINT } from '../lib/materials.ts'

const BRAZIL_CENTER: L.LatLngTuple = [-14.2, -51.9]
const BRAZIL_ZOOM = 4
// Keeps the map from zooming in to street level when there is only one point.
const MAX_FIT_ZOOM = 15
// Same as Tailwind's "md" breakpoint, where the details panel moves to the right side.
const DESKTOP_QUERY = '(min-width: 768px)'
// Size of the details panel (see PointDetailsPanel: md:w-96 and max-h-[65%]).
const PANEL_WIDTH = 384
const BOTTOM_SHEET_SHARE = 0.65

function pinIcon(fill: string, width: number): L.Icon {
  const height = Math.round((width * 42) / 30)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 30 42">` +
    `<path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 41 15 41s14-15.7 14-26.1C29 7.2 22.7 1 15 1z" ` +
    `fill="${fill}" stroke="#ffffff" stroke-width="2"/>` +
    '<circle cx="15" cy="15" r="5.5" fill="#ffffff"/></svg>'
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
  })
}

const DEFAULT_ICON = pinIcon('#047857', 30) // emerald-700
const SELECTED_ICON = pinIcon('#b45309', 38) // amber-700

function FitToPoints({ points }: { points: PointSummary[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) {
      return
    }
    const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude] as L.LatLngTuple))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: MAX_FIT_ZOOM })
  }, [map, points])
  return null
}

function KeepSelectedVisible({ point }: { point: PointSummary | null }) {
  const map = useMap()
  useEffect(() => {
    if (!point) {
      return
    }
    // Leave room for the details panel so it does not cover the selected marker.
    const paddingBottomRight: L.PointTuple = window.matchMedia(DESKTOP_QUERY).matches
      ? [PANEL_WIDTH + 24, 24]
      : [24, Math.round(map.getSize().y * BOTTOM_SHEET_SHARE) + 24]
    map.panInside([point.latitude, point.longitude], { paddingTopLeft: [24, 48], paddingBottomRight })
  }, [map, point])
  return null
}

interface PointMapProps {
  points: PointSummary[]
  selected: PointSummary | null
  onSelect: (point: PointSummary) => void
}

export default function PointMap({ points, selected, onSelect }: PointMapProps) {
  return (
    <MapContainer center={BRAZIL_CENTER} zoom={BRAZIL_ZOOM} className="absolute inset-0 z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point) => {
        const name = point.name ?? UNNAMED_POINT
        return (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={point.id === selected?.id ? SELECTED_ICON : DEFAULT_ICON}
            zIndexOffset={point.id === selected?.id ? 1000 : 0}
            title={name}
            alt={name}
            keyboard
            eventHandlers={{ click: () => onSelect(point) }}
          />
        )
      })}
      <FitToPoints points={points} />
      <KeepSelectedVisible point={selected} />
    </MapContainer>
  )
}
