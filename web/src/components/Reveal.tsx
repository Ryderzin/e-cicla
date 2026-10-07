import { type ReactNode, useEffect, useRef } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Waits this long (ms) before appearing, to show items of a list one after the other. */
  delay?: number
}

/**
 * Fades its content in when it scrolls into view. Only an effect: the content is always in the page
 * and readable by screen readers, and people who ask the system for less motion see it right away
 * (see .reveal in index.css).
 */
export default function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }
    if (!('IntersectionObserver' in window)) {
      element.classList.add('is-visible')
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('is-visible')
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}
