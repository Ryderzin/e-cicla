// Uses the browser's native Web Speech API (speechSynthesis) to read text aloud in Brazilian Portuguese.
// Breaks long texts into sentences to work around Chrome's ~15s utterance timeout.

export type SpeechState = 'idle' | 'speaking' | 'paused'

export interface SpeechListener {
  id: string
  onStateChange: (state: SpeechState) => void
}

let activeSpeakerId: string | null = null
let currentState: SpeechState = 'idle'
let sentencesQueue: string[] = []
let currentSentenceIndex = 0
let listeners: SpeechListener[] = []
let voices: SpeechSynthesisVoice[] = []

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) {
    return []
  }
  voices = window.speechSynthesis.getVoices()
  return voices
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices()
  }
}

export function getBestPtVoice(): SpeechSynthesisVoice | null {
  const currentVoices = voices.length > 0 ? voices : loadVoices()
  if (currentVoices.length === 0) {
    return null
  }
  const ptBr = currentVoices.find((v) => {
    const lang = v.lang.toLowerCase().replace('_', '-')
    return lang.startsWith('pt-br')
  })
  if (ptBr) {
    return ptBr
  }
  const pt = currentVoices.find((v) => v.lang.toLowerCase().startsWith('pt'))
  if (pt) {
    return pt
  }
  return null
}

function notifyAll() {
  for (const listener of listeners) {
    if (listener.id === activeSpeakerId) {
      listener.onStateChange(currentState)
    } else {
      listener.onStateChange('idle')
    }
  }
}

export function addSpeechListener(id: string, onStateChange: (state: SpeechState) => void): () => void {
  listeners.push({ id, onStateChange })
  return () => {
    listeners = listeners.filter((l) => l.id !== id)
    if (activeSpeakerId === id) {
      stop()
    }
  }
}

export function splitIntoSentences(text: string): string[] {
  const cleaned = text.trim()
  if (!cleaned) {
    return []
  }
  // Split on punctuation followed by space or on line breaks
  const parts = cleaned.split(/(?<=[.!?])\s+|\n+/)
  return parts
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function speakNextSentence() {
  if (!isSpeechSupported()) {
    return
  }
  if (currentSentenceIndex >= sentencesQueue.length) {
    currentState = 'idle'
    activeSpeakerId = null
    notifyAll()
    return
  }

  const sentence = sentencesQueue[currentSentenceIndex]
  const utterance = new SpeechSynthesisUtterance(sentence)
  utterance.lang = 'pt-BR'
  const voice = getBestPtVoice()
  if (voice) {
    utterance.voice = voice
  }

  utterance.onend = () => {
    if (currentState === 'speaking') {
      currentSentenceIndex++
      speakNextSentence()
    }
  }

  utterance.onerror = (event) => {
    if (event.error !== 'interrupted' && event.error !== 'canceled') {
      console.warn('Speech synthesis error:', event.error)
    }
    currentState = 'idle'
    activeSpeakerId = null
    notifyAll()
  }

  window.speechSynthesis.speak(utterance)
}

export function speak(speakerId: string, text: string): void {
  if (!isSpeechSupported()) {
    return
  }
  stop()

  const sentences = splitIntoSentences(text)
  if (sentences.length === 0) {
    return
  }

  activeSpeakerId = speakerId
  currentState = 'speaking'
  sentencesQueue = sentences
  currentSentenceIndex = 0
  notifyAll()

  speakNextSentence()
}

export function pause(): void {
  if (!isSpeechSupported() || currentState !== 'speaking') {
    return
  }
  window.speechSynthesis.pause()
  currentState = 'paused'
  notifyAll()
}

export function resume(): void {
  if (!isSpeechSupported() || currentState !== 'paused') {
    return
  }
  window.speechSynthesis.resume()
  currentState = 'speaking'
  notifyAll()
}

export function stop(): void {
  if (!isSpeechSupported()) {
    return
  }
  try {
    window.speechSynthesis.cancel()
  } catch {
    // Ignore cancel errors
  }
  currentState = 'idle'
  activeSpeakerId = null
  sentencesQueue = []
  currentSentenceIndex = 0
  notifyAll()
}

export function getActiveSpeakerId(): string | null {
  return activeSpeakerId
}

export function getCurrentState(): SpeechState {
  return currentState
}
