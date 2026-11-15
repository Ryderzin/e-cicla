import type { Material } from '../api/points.ts'
import { ApplianceIcon, BatteryIcon, LaptopIcon, PhoneIcon, PlugIcon } from './icons.tsx'

/**
 * The icon of each kind of item (decorative: the name is always written next to it). Loose cables and
 * chargers use the plug; other electronic devices too.
 */
export default function DeviceIcon({ kind, className }: { kind: Material; waste?: boolean; className?: string }) {
  switch (kind) {
    case 'BATTERIES':
      return <BatteryIcon className={className} />
    case 'MOBILE_PHONES':
      return <PhoneIcon className={className} />
    case 'COMPUTERS':
      return <LaptopIcon className={className} />
    case 'SMALL_APPLIANCES':
      return <ApplianceIcon className={className} />
    default:
      return <PlugIcon className={className} />
  }
}
