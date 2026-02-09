'use client'

import { useState, useEffect, useRef } from 'react'

interface PausePoint {
  after: number
  duration: number
}

interface TypingAnimationConfig {
  charDelay?: number
  startDelay?: number
  pausePoints?: PausePoint[]
  enabled?: boolean
  onComplete?: () => void
}

export default function useTypingAnimation(fullText: string, config: TypingAnimationConfig = {}) {
  const {
    charDelay = 75,
    startDelay = 0,
    pausePoints = [],
    enabled = true,
    onComplete = null
  } = config

  const [displayText, setDisplayText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const animationRef = useRef<number | null>(null)
  const stateRef = useRef({
    startTime: null as number | null,
    currentIndex: 0,
    totalPauseTime: 0,
    activePauseEnd: 0
  })

  useEffect(() => {
    if (!enabled || !fullText) {
      return
    }

    stateRef.current = {
      startTime: null,
      currentIndex: 0,
      totalPauseTime: 0,
      activePauseEnd: 0
    }
    setDisplayText('')
    setIsComplete(false)

    const animate = (timestamp: number) => {
      const state = stateRef.current

      if (!state.startTime) {
        state.startTime = timestamp
      }

      const elapsed = timestamp - state.startTime

      if (elapsed < startDelay) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      if (state.activePauseEnd > 0 && timestamp < state.activePauseEnd) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const typingElapsed = elapsed - startDelay - state.totalPauseTime
      const targetIndex = Math.min(
        Math.floor(typingElapsed / charDelay),
        fullText.length
      )

      if (targetIndex > state.currentIndex) {
        state.currentIndex = targetIndex
        setDisplayText(fullText.substring(0, targetIndex))

        const pausePoint = pausePoints.find(p => p.after === targetIndex)
        if (pausePoint) {
          state.activePauseEnd = timestamp + pausePoint.duration
          state.totalPauseTime += pausePoint.duration
        }
      }

      if (state.currentIndex >= fullText.length) {
        setIsComplete(true)
        if (onComplete) onComplete()
        return
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [fullText, charDelay, startDelay, JSON.stringify(pausePoints), enabled])

  return { displayText, isComplete }
}
