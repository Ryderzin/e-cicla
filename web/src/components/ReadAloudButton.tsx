import { useEffect, useId, useState } from 'react'
import { useLocation } from 'react-router'

import { addSpeechListener, isSpeechSupported, pause, resume, speak, type SpeechState, stop } from '../lib/speech.ts'
import { PauseIcon, PlayIcon, SpeakerIcon, StopIcon } from './icons.tsx'

interface ReadAloudButtonProps {
  text?: string
  getText?: () => string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export default function ReadAloudButton({
  text,
  getText,
  label = 'Ouvir',
  className = '',
  size = 'md',
}: ReadAloudButtonProps) {
  const buttonId = useId()
  const location = useLocation()
  const [supported] = useState(isSpeechSupported)
  const [speechState, setSpeechState] = useState<SpeechState>('idle')
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const unsubscribe = addSpeechListener(buttonId, (state) => {
      setSpeechState(state)
    })
    return () => {
      unsubscribe()
    }
  }, [buttonId])

  // Stop speaking when user navigates to another page
  useEffect(() => {
    stop()
  }, [location.pathname])

  if (!supported) {
    return null
  }

  const handleStart = () => {
    const content = text ?? getText?.() ?? ''
    if (content.trim()) {
      setAnnouncement('Iniciando leitura em voz alta.')
      speak(buttonId, content)
    }
  }

  const handlePause = () => {
    setAnnouncement('Leitura em voz alta pausada.')
    pause()
  }

  const handleResume = () => {
    setAnnouncement('Continuando leitura em voz alta.')
    resume()
  }

  const handleStop = () => {
    setAnnouncement('Leitura em voz alta interrompida.')
    stop()
  }

  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4'

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      {speechState === 'idle' && (
        <button
          type="button"
          onClick={handleStart}
          aria-pressed={false}
          aria-label={label}
          title={label}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-3 focus-visible:outline-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${sizeClass}`}
        >
          <SpeakerIcon className={iconSize} />
          <span>{label}</span>
        </button>
      )}

      {speechState === 'speaking' && (
        <div className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 p-0.5 dark:border-emerald-800 dark:bg-emerald-950/60">
          <button
            type="button"
            onClick={handlePause}
            aria-pressed={true}
            aria-label="Pausar leitura"
            title="Pausar leitura"
            className={`inline-flex items-center gap-1 rounded-md bg-white font-medium text-emerald-900 shadow-2xs hover:bg-slate-50 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800 ${sizeClass}`}
          >
            <PauseIcon className={iconSize} />
            <span>Pausar</span>
          </button>
          <button
            type="button"
            onClick={handleStop}
            aria-label="Parar leitura"
            title="Parar leitura"
            className={`inline-flex items-center gap-1 rounded-md font-medium text-slate-700 hover:bg-emerald-100/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-emerald-900/40 dark:hover:text-slate-100 ${sizeClass}`}
          >
            <StopIcon className={iconSize} />
            <span>Parar</span>
          </button>
        </div>
      )}

      {speechState === 'paused' && (
        <div className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 p-0.5 dark:border-amber-800 dark:bg-amber-950/60">
          <button
            type="button"
            onClick={handleResume}
            aria-pressed={false}
            aria-label="Continuar leitura"
            title="Continuar leitura"
            className={`inline-flex items-center gap-1 rounded-md bg-white font-medium text-amber-950 shadow-2xs hover:bg-slate-50 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800 ${sizeClass}`}
          >
            <PlayIcon className={iconSize} />
            <span>Continuar</span>
          </button>
          <button
            type="button"
            onClick={handleStop}
            aria-label="Parar leitura"
            title="Parar leitura"
            className={`inline-flex items-center gap-1 rounded-md font-medium text-slate-700 hover:bg-amber-100/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-amber-900/40 dark:hover:text-slate-100 ${sizeClass}`}
          >
            <StopIcon className={iconSize} />
            <span>Parar</span>
          </button>
        </div>
      )}
    </div>
  )
}
