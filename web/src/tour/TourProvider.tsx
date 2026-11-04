import {
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react'

import { CloseIcon, HelpCircleIcon } from '../components/icons.tsx'
import { stop as stopSpeech } from '../lib/speech.ts'
import { TourContext, type TourContextValue } from './context.ts'
import { TOUR_STEPS } from './steps.ts'

const STORAGE_KEY = 'ecicla:tutorial-visto'

function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markTutorialSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Ignore storage quota or access errors
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const directionRef = useRef<'forward' | 'backward'>('forward')
  const [showInvite, setShowInvite] = useState(() => !hasSeenTutorial())
  const triggerRef = useRef<HTMLElement | null>(null)

  const startTour = useCallback((triggerElement?: HTMLElement | null) => {
    if (triggerElement) {
      triggerRef.current = triggerElement
    } else if (document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement
    }
    stopSpeech()
    markTutorialSeen()
    setShowInvite(false)
    directionRef.current = 'forward'
    setDirection('forward')
    setCurrentStepIndex(0)
    setIsOpen(true)
  }, [])

  const closeTour = useCallback(() => {
    stopSpeech()
    setIsOpen(false)
    if (triggerRef.current && triggerRef.current.isConnected) {
      triggerRef.current.focus()
    }
  }, [])

  const nextStep = useCallback(() => {
    stopSpeech()
    directionRef.current = 'forward'
    setDirection('forward')
    setCurrentStepIndex((current) => {
      if (current < TOUR_STEPS.length - 1) {
        return current + 1
      }
      closeTour()
      return current
    })
  }, [closeTour])

  const prevStep = useCallback(() => {
    stopSpeech()
    directionRef.current = 'backward'
    setDirection('backward')
    setCurrentStepIndex((current) => Math.max(0, current - 1))
  }, [])

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      stopSpeech()
      directionRef.current = index >= currentStepIndex ? 'forward' : 'backward'
      setDirection(directionRef.current)
      setCurrentStepIndex(index)
    }
  }, [currentStepIndex])

  const skipStep = useCallback(() => {
    stopSpeech()
    if (directionRef.current === 'backward') {
      setCurrentStepIndex((current) => Math.max(0, current - 1))
    } else {
      setCurrentStepIndex((current) => {
        if (current < TOUR_STEPS.length - 1) {
          return current + 1
        }
        closeTour()
        return current
      })
    }
  }, [closeTour])

  const acceptInvite = useCallback(() => {
    startTour()
  }, [startTour])

  const dismissInvite = useCallback(() => {
    markTutorialSeen()
    setShowInvite(false)
  }, [])

  const currentStep = TOUR_STEPS[currentStepIndex] ?? TOUR_STEPS[0]

  const value: TourContextValue = {
    isOpen,
    currentStepIndex,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    direction,
    startTour,
    closeTour,
    nextStep,
    prevStep,
    goToStep,
    skipStep,
    showInvite,
    acceptInvite,
    dismissInvite,
  }

  return (
    <TourContext.Provider value={value}>
      {children}

      {showInvite && !isOpen && (
        <aside
          role="region"
          aria-label="Convite para o tutorial"
          className="fixed right-4 bottom-4 left-4 z-40 mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl ring-1 ring-emerald-900/5 transition-all sm:right-6 sm:left-auto dark:border-emerald-800/60 dark:bg-slate-900 dark:ring-white/10"
        >
          <div className="flex items-start gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              aria-hidden="true"
            >
              <HelpCircleIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Primeira vez aqui?
              </h2>
              <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                Veja como usar o E-Cicla em 2 minutos com nosso tutorial guiado.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={acceptInvite}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  Começar tutorial
                </button>
                <button
                  type="button"
                  onClick={dismissInvite}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Agora não
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissInvite}
              aria-label="Dispensar convite do tutorial"
              className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        </aside>
      )}
    </TourContext.Provider>
  )
}
