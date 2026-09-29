import type { ReactNode } from 'react'

// Simple line icons. They are decorative: the text next to them carries the meaning.

interface IconProps {
  className?: string
}

function Icon({ className = 'size-6', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  )
}

export function LogoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
      <path d="M13 7.5 10 12h4l-3 4.5" />
    </Icon>
  )
}

export function PhoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </Icon>
  )
}

export function BatteryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M6 10v4M10 10v4" />
    </Icon>
  )
}

export function ChargerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 2v5M15 2v5" />
      <path d="M6 7h12v4a6 6 0 0 1-12 0z" />
      <path d="M12 17v5" />
    </Icon>
  )
}

export function LaptopIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="11" rx="1.5" />
      <path d="M2 19h20" />
    </Icon>
  )
}

export function ApplianceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3h10l-1.5 10h-7z" />
      <rect x="6" y="13" width="12" height="8" rx="1.5" />
      <circle cx="12" cy="17" r="1" />
    </Icon>
  )
}

export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 22 20H2z" />
      <path d="M12 10v4M12 17v.5" />
    </Icon>
  )
}

export function MapPinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icon>
  )
}

export function ChecklistIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="m9 9 1.5 1.5L13.5 7.5" />
      <path d="M9 15h6" />
    </Icon>
  )
}

export function BoxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  )
}

export function RouteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 11 21 3l-8 18-2-8z" />
    </Icon>
  )
}
