import { createContext } from 'react'
import type { TourStep } from './steps.ts'

export interface TourContextValue {
  isOpen: boolean
  currentStepIndex: number
  currentStep: TourStep
  totalSteps: number
  direction: 'forward' | 'backward'
  startTour: (triggerElement?: HTMLElement | null) => void
  closeTour: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  skipStep: () => void
  showInvite: boolean
  acceptInvite: () => void
  dismissInvite: () => void
}

export const TourContext = createContext<TourContextValue | null>(null)
