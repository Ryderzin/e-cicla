import L from 'leaflet'

import fatecLogo from '../assets/fatec-zona-leste.png'
import { FATEC_ZONA_LESTE, REGION_BOUNDS } from './region.ts'

// A little margin around the region so points on its edge are not stuck under the map controls.
export const MAX_BOUNDS = L.latLngBounds(
  [REGION_BOUNDS.minLat, REGION_BOUNDS.minLng],
  [REGION_BOUNDS.maxLat, REGION_BOUNDS.maxLng],
).pad(0.05)

export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

// Pin drawn on a 30x42 grid, with a white circle on its head.
function pinSvg(fill: string, width: number, circleRadius: number): string {
  const height = pinHeight(width)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 30 42" style="display:block">` +
    '<path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 41 15 41s14-15.7 14-26.1C29 7.2 22.7 1 15 1z" ' +
    `fill="${fill}" stroke="#ffffff" stroke-width="2"/>` +
    `<circle cx="15" cy="15" r="${circleRadius}" fill="#ffffff"/></svg>`
  )
}

function pinHeight(width: number): number {
  return Math.round((width * 42) / 30)
}

function pinIcon(fill: string, width: number): L.Icon {
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg(fill, width, 5.5))}`,
    iconSize: [width, pinHeight(width)],
    iconAnchor: [width / 2, pinHeight(width)],
  })
}

export const DEFAULT_ICON = pinIcon('#047857', 30) // emerald-700
export const SELECTED_ICON = pinIcon('#b45309', 38) // amber-700

// Our pin, larger, with the Fatec logo inside a bigger white circle on its head.
const FATEC_ICON_WIDTH = 44
const FATEC_LOGO_HEIGHT = 24
export const FATEC_ICON = L.divIcon({
  className: '',
  html:
    pinSvg('#047857', FATEC_ICON_WIDTH, 11) +
    // Centered on the circle, which sits at y = 15 on the 30x42 grid.
    `<img src="${fatecLogo}" alt="${FATEC_ZONA_LESTE.name}" style="position:absolute;left:50%;transform:translateX(-50%);` +
    `top:${Math.round((15 * FATEC_ICON_WIDTH) / 30 - FATEC_LOGO_HEIGHT / 2)}px;height:${FATEC_LOGO_HEIGHT}px">`,
  iconSize: [FATEC_ICON_WIDTH, pinHeight(FATEC_ICON_WIDTH)],
  iconAnchor: [FATEC_ICON_WIDTH / 2, pinHeight(FATEC_ICON_WIDTH)],
})

// Where the nearby search started (the user's location or the searched address): a blue dot with a halo.
export const ORIGIN_ICON = L.divIcon({
  className: '',
  html:
    '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#1d4ed8;' +
    'border:3px solid #ffffff;box-shadow:0 0 0 6px rgba(29,78,216,0.25)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})
