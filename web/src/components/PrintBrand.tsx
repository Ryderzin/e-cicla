/**
 * E-Cicla logo for the top right corner of printed reports and PDFs (PB30, PB31). Hidden on the screen,
 * where the site header already shows the name. Same drawing as the site icon (public/favicon.svg).
 */
export default function PrintBrand() {
  return (
    <div className="print-brand hidden items-center justify-end gap-2 print:flex" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="36" height="36">
        <rect width="24" height="24" rx="6" fill="#047857" />
        <g fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.5 12a6.5 6.5 0 1 1-1.9-4.6" />
          <path d="M18.5 5.5v3.8h-3.8" />
          <path d="M12.8 8.2 10.6 12h3l-2.2 3.8" />
        </g>
      </svg>
      <span className="text-2xl font-bold" style={{ color: '#047857' }}>
        E-Cicla
      </span>
    </div>
  )
}
