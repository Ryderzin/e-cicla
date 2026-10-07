import fatecLogo from '../../assets/fatec-zona-leste.png'

// Same pin as the map markers (lib/leaflet.ts), drawn on a 30x42 grid.
const PIN_PATH = 'M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 41 15 41s14-15.7 14-26.1C29 7.2 22.7 1 15 1z'

function Pin({ x, y, color = '#047857', size = 30 }: { x: number; y: number; color?: string; size?: number }) {
  // (x, y) is where the tip of the pin touches the map, in % of the illustration.
  return (
    <svg
      viewBox="0 0 30 42"
      width={size}
      height={(size * 42) / 30}
      className="absolute -translate-x-1/2 -translate-y-full drop-shadow-md"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <path d={PIN_PATH} fill={color} stroke="#ffffff" strokeWidth="2" />
      <circle cx="15" cy="15" r="5.5" fill="#ffffff" />
    </svg>
  )
}

/**
 * Drawing of a map with collection points around the Fatec Zona Leste, next to the home page title.
 * Decorative only (hidden from screen readers); the selected point pulses unless the system asks for
 * less motion.
 */
export default function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative ${className}`}>
      <div className="relative aspect-[5/4] overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-emerald-100">
        <svg viewBox="0 0 400 320" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="320" fill="#f1f5f9" />
          {/* Parks and a river */}
          <path d="M-10 230 C 60 200, 110 260, 170 235 S 260 190, 410 215 L 410 330 L -10 330 Z" fill="#d1fae5" />
          <ellipse cx="300" cy="80" rx="70" ry="45" fill="#d1fae5" />
          <path d="M-10 120 C 70 140, 130 95, 210 120 S 330 160, 410 130" fill="none" stroke="#bfdbfe" strokeWidth="14" />
          {/* Streets */}
          <g stroke="#ffffff" strokeLinecap="round">
            <path d="M0 60 L400 40" strokeWidth="10" />
            <path d="M0 180 L400 170" strokeWidth="12" />
            <path d="M80 0 L110 320" strokeWidth="10" />
            <path d="M230 0 L250 320" strokeWidth="12" />
            <path d="M340 0 L320 320" strokeWidth="8" />
            <path d="M0 270 L400 285" strokeWidth="8" />
          </g>
          <g stroke="#e2e8f0" strokeLinecap="round" strokeWidth="4">
            <path d="M20 100 L200 90" />
            <path d="M150 0 L170 160" />
            <path d="M260 230 L400 240" />
            <path d="M40 220 L60 320" />
          </g>
        </svg>

        <Pin x={22} y={42} />
        <Pin x={70} y={30} />
        <Pin x={84} y={72} />
        <Pin x={30} y={86} />

        {/* The selected point: amber, with a soft halo that pulses */}
        <span
          className="absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/40 motion-safe:animate-ping"
          style={{ left: '58%', top: '64%' }}
        />
        <Pin x={58} y={66} color="#b45309" size={38} />

        {/* The Fatec Zona Leste, as on the real map */}
        <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: '42%', top: '52%' }}>
          <svg viewBox="0 0 30 42" width="44" height="62" className="drop-shadow-md">
            <path d={PIN_PATH} fill="#047857" stroke="#ffffff" strokeWidth="2" />
            <circle cx="15" cy="15" r="11" fill="#ffffff" />
          </svg>
          <img src={fatecLogo} alt="" className="absolute top-[10px] left-1/2 h-6 -translate-x-1/2" />
        </div>
      </div>

      {/* Card like the point details, floating over the map */}
      <div className="absolute -bottom-6 -left-6 w-56 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 motion-safe:transition-transform motion-safe:hover:-translate-y-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-slate-900">Ponto de coleta</span>
          <span className="text-sm font-medium text-slate-600">1,2 km</span>
        </p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">Celulares</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
            Pilhas e baterias
          </span>
        </p>
      </div>
    </div>
  )
}
