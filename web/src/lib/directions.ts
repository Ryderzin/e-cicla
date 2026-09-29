// Link that opens a route to the point in the user's maps app: Apple Maps on iPhone/iPad,
// Google Maps elsewhere (it opens the app on Android when installed, or the website otherwise).
export function directionsUrl(latitude: number, longitude: number): string {
  const destination = `${latitude},${longitude}`
  if (isAppleMobile()) {
    return `https://maps.apple.com/?daddr=${destination}`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

function isAppleMobile(): boolean {
  // iPadOS reports itself as a Mac, but with touch support.
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
}
