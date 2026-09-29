import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'

import type { PointSummary } from '../api/points.ts'
import { UNNAMED_POINT } from '../lib/materials.ts'
import { INITIAL_CENTER, REGION_BOUNDS } from '../lib/region.ts'

// Same as Tailwind's "md" breakpoint, where the details panel moves to the right side.
const DESKTOP_QUERY = '(min-width: 768px)'
// Zoomed in on the initial center's neighbourhood; one level wider on narrow phone screens
// so the nearest points are still in view.
const INITIAL_ZOOM_DESKTOP = 12
const INITIAL_ZOOM_PHONE = 11
// A little margin around the region so points on its edge are not stuck under the map controls.
const MAX_BOUNDS = L.latLngBounds(
  [REGION_BOUNDS.minLat, REGION_BOUNDS.minLng],
  [REGION_BOUNDS.maxLat, REGION_BOUNDS.maxLng],
).pad(0.05)
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

/** Stops zooming out past the level where the whole region fits on screen (it depends on the screen size). */
function LimitZoomToRegion() {
  const map = useMap()
  useEffect(() => {
    const updateMinZoom = () => map.setMinZoom(map.getBoundsZoom(MAX_BOUNDS))
    updateMinZoom()
    map.on('resize', updateMinZoom)
    return () => {
      map.off('resize', updateMinZoom)
    }
  }, [map])
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
  const initialZoom = window.matchMedia(DESKTOP_QUERY).matches ? INITIAL_ZOOM_DESKTOP : INITIAL_ZOOM_PHONE
  return (
    <MapContainer
      center={[INITIAL_CENTER.latitude, INITIAL_CENTER.longitude]}
      zoom={initialZoom}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={1}
      className="absolute inset-0 z-0"
    >
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
            eventHandlers={{
              click: () => onSelect(point),
              // Leaflet makes markers focusable buttons but only opens popups on Enter, so handle it here.
              keydown: (event: L.LeafletKeyboardEvent) => {
                const key = event.originalEvent.key
                if (key === 'Enter' || key === ' ') {
                  event.originalEvent.preventDefault()
                  onSelect(point)
                }
              },
            }}
          />
        )
      })}
      <LimitZoomToRegion />
      <KeepSelectedVisible point={selected} />
    </MapContainer>
  )
}
