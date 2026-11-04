import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { CloseIcon } from '../components/icons.tsx'
import ReadAloudButton from '../components/ReadAloudButton.tsx'
import { useTour } from './useTour.ts'

export default function GuidedTour() {
  const {
    isOpen,
    currentStepIndex,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    closeTour,
  } = useTour()

  const location = useLocation()
  const navigate = useNavigate()

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 640,
  )

  const dialogRef = useRef<HTMLDivElement>(null)
  const targetElementRef = useRef<HTMLElement | null>(null)

  // Track viewport changes
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 640)
      if (targetElementRef.current) {
        setTargetRect(targetElementRef.current.getBoundingClientRect())
      }
    }
    const handleScroll = () => {
      if (targetElementRef.current) {
        setTargetRect(targetElementRef.current.getBoundingClientRect())
      }
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  // Resolve target element and navigate if necessary
  useEffect(() => {
    if (!isOpen) {
      return
    }

    // If step belongs to another page, navigate
    if (currentStep.path && location.pathname !== currentStep.path) {
      navigate(currentStep.path)
    }

    let canceled = false
    const startTime = Date.now()
    const maxWaitMs = 3000

    const findTarget = () => {
      if (canceled) return

      let el: HTMLElement | null = document.querySelector(
        `[data-tour="${currentStep.selector}"]`,
      )
      if (!el && currentStep.fallbackSelector) {
        el = document.querySelector(
          `[data-tour="${currentStep.fallbackSelector}"]`,
        )
      }

      if (el) {
        targetElementRef.current = el
        const rect = el.getBoundingClientRect()
        setTargetRect(rect)

        const prefersReducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches

        el.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'center',
        })
      } else if (Date.now() - startTime < maxWaitMs) {
        requestAnimationFrame(findTarget)
      } else {
        // Target not found within timeout; display centered dialog without spotlight
        setTargetRect(null)
        targetElementRef.current = null
      }
    }

    const timer = setTimeout(findTarget, 60)
    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [isOpen, currentStep, location.pathname, navigate])

  // Focus management and keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    // Move focus inside dialog
    const focusTimer = setTimeout(() => {
      if (!dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const nextBtn = dialogRef.current.querySelector<HTMLElement>('[data-tour-action="next"]')
      if (nextBtn) {
        nextBtn.focus()
      } else if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        dialogRef.current.focus()
      }
    }, 100)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeTour()
      } else if (event.key === 'ArrowRight') {
        if (
          !(document.activeElement instanceof HTMLInputElement) &&
          !(document.activeElement instanceof HTMLTextAreaElement)
        ) {
          event.preventDefault()
          nextStep()
        }
      } else if (event.key === 'ArrowLeft') {
        if (
          !(document.activeElement instanceof HTMLInputElement) &&
          !(document.activeElement instanceof HTMLTextAreaElement)
        ) {
          event.preventDefault()
          prevStep()
        }
      } else if (event.key === 'Tab') {
        // Focus trap
        if (!dialogRef.current) return
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute('disabled'))

        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, currentStepIndex, closeTour, nextStep, prevStep])

  const speechText = `${currentStep.title}. ${currentStep.text}`

  // Calculate popover style for desktop
  const getPopoverStyle = useCallback((): React.CSSProperties => {
    if (!isDesktop || !targetRect) {
      return {}
    }

    const popoverWidth = 380
    const popoverHeight = 240
    const padding = 16

    const spaceBelow = window.innerHeight - targetRect.bottom
    const spaceAbove = targetRect.top

    let top: number
    if (spaceBelow >= popoverHeight + padding) {
      top = targetRect.bottom + 12
    } else if (spaceAbove >= popoverHeight + padding) {
      top = Math.max(padding, targetRect.top - popoverHeight - 12)
    } else {
      top = Math.max(padding, Math.min(window.innerHeight - popoverHeight - padding, targetRect.top))
    }

    let left = targetRect.left
    if (left + popoverWidth > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - popoverWidth - padding)
    }
    if (left < padding) {
      left = padding
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      zIndex: 2200,
    }
  }, [isDesktop, targetRect])

  if (!isOpen) return null

  const isLastStep = currentStepIndex === totalSteps - 1

  return (
    <>
      {/* Backdrop / Spotlight */}
      {targetRect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[2100] rounded-xl transition-all duration-300"
          style={{
            top: Math.max(0, targetRect.top - 6),
            left: Math.max(0, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72)',
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[2100] bg-slate-950/70 backdrop-blur-xs"
        />
      )}

      {/* Tour Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-desc"
        tabIndex={-1}
        style={getPopoverStyle()}
        className={
          isDesktop && targetRect
            ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl transition-all focus:outline-none dark:border-slate-800 dark:bg-slate-900'
            : 'fixed inset-x-3 bottom-3 z-[2200] mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl focus:outline-none dark:border-slate-800 dark:bg-slate-900 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2'
        }
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Passo {currentStepIndex + 1} de {totalSteps}
          </span>
          <button
            type="button"
            onClick={closeTour}
            aria-label="Sair do tutorial"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <span>Sair</span>
            <CloseIcon className="size-4" />
          </button>
        </div>

        <div className="mt-3">
          <h2
            id="tour-step-title"
            className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg"
          >
            {currentStep.title}
          </h2>
          <p
            id="tour-step-desc"
            className="mt-1.5 text-sm text-slate-700 dark:text-slate-300"
          >
            {currentStep.text}
          </p>
        </div>

        <div className="mt-3">
          <ReadAloudButton size="sm" text={speechText} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <div>
            {currentStepIndex > 0 ? (
              <button
                type="button"
                onClick={prevStep}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Anterior
              </button>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-600 sm:inline">
                Use as setas ← →
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-tour-action="next"
              onClick={isLastStep ? closeTour : nextStep}
              className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {isLastStep ? 'Concluir' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
