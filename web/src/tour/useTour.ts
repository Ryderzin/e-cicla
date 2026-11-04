import { useContext } from 'react'

import { TourContext, type TourContextValue } from './context.ts'

export function useTour(): TourContextValue {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used inside <TourProvider>')
  }
  return context
}
