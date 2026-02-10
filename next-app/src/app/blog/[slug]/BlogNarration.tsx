'use client'

import { useRef, useEffect, useCallback, type RefObject } from 'react'
import type { WordTimestamp } from '@/types/blog'

interface BlogNarrationProps {
  audioUrl: string
  wordTimestamps: WordTimestamp[]
  durationSeconds: number
  contentWords: string[]
  articleRef: RefObject<HTMLElement | null>
  contentContainerRef: RefObject<HTMLDivElement | null>
  isReading: boolean
  onReadingChange: (reading: boolean) => void
}

export default function BlogNarration({
  audioUrl,
  wordTimestamps,
  durationSeconds,
  contentWords,
  articleRef,
  contentContainerRef,
  isReading,
  onReadingChange,
}: BlogNarrationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const wordTimerRef = useRef<number | null>(null)
  const wordTimestampsRef = useRef<WordTimestamp[]>(wordTimestamps)
  const currentHighlightRef = useRef<HTMLElement | null>(null)
  const headerWordIndicesRef = useRef<Array<{ wordIndex: number; tagName: string }>>([])
  const lastScrolledHeaderRef = useRef(-1)

  // Keep ref in sync
  useEffect(() => {
    wordTimestampsRef.current = wordTimestamps
  }, [wordTimestamps])

  // Build header word index map when content changes
  useEffect(() => {
    if (!contentContainerRef.current || !isReading) return

    // Wait for DOM to be ready with word spans
    requestAnimationFrame(() => {
      const container = contentContainerRef.current
      if (!container) return

      const headerIndices: Array<{ wordIndex: number; tagName: string }> = []
      const headers = container.querySelectorAll('h2, h3')

      headers.forEach((header) => {
        const firstWordSpan = header.querySelector('[data-word-index]')
        if (firstWordSpan) {
          const wordIndex = parseInt(firstWordSpan.getAttribute('data-word-index') || '0', 10)
          headerIndices.push({ wordIndex, tagName: header.tagName.toLowerCase() })
        }
      })

      headerWordIndicesRef.current = headerIndices
    })
  }, [isReading, contentContainerRef])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (wordTimerRef.current) {
        cancelAnimationFrame(wordTimerRef.current)
      }
    }
  }, [])

  // Smooth scroll to a header element
  const scrollToHeader = useCallback((headerIndex: number) => {
    if (!articleRef.current) return

    const headers = articleRef.current.querySelectorAll('h2, h3')
    if (headerIndex >= headers.length) return

    const targetHeader = headers[headerIndex]
    const navBarHeight = 100
    const targetPosition = targetHeader.getBoundingClientRect().top + window.pageYOffset - navBarHeight
    const startPosition = window.pageYOffset
    const distance = targetPosition - startPosition
    const duration = 1200
    let startTime: number | null = null

    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    const animateScroll = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const timeElapsed = currentTime - startTime
      const progress = Math.min(timeElapsed / duration, 1)
      const easedProgress = easeInOutCubic(progress)

      window.scrollTo(0, startPosition + distance * easedProgress)

      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      }
    }

    requestAnimationFrame(animateScroll)
  }, [articleRef])

  // Check if current word is at a header and scroll if needed
  const checkAndScrollToHeader = useCallback((wordIndex: number) => {
    const headers = headerWordIndicesRef.current
    for (let i = 0; i < headers.length; i++) {
      if (wordIndex === headers[i].wordIndex && lastScrolledHeaderRef.current < i) {
        lastScrolledHeaderRef.current = i
        scrollToHeader(i)
        break
      }
    }
  }, [scrollToHeader])

  const clearHighlight = useCallback(() => {
    if (currentHighlightRef.current) {
      currentHighlightRef.current.style.backgroundColor = ''
      currentHighlightRef.current.style.padding = ''
      currentHighlightRef.current.style.margin = ''
      currentHighlightRef.current.style.borderRadius = ''
      currentHighlightRef.current = null
    }
  }, [])

  const handleToggleReading = useCallback(async () => {
    if (isReading) {
      // Stop reading
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (wordTimerRef.current) {
        cancelAnimationFrame(wordTimerRef.current)
      }
      clearHighlight()
      onReadingChange(false)
      lastScrolledHeaderRef.current = -1
      return
    }

    // Start reading
    lastScrolledHeaderRef.current = -1
    onReadingChange(true)

    try {
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        onReadingChange(false)
        clearHighlight()
        audioRef.current = null
      }

      audio.onerror = () => {
        onReadingChange(false)
        clearHighlight()
        audioRef.current = null
      }

      await audio.play()

      // Start word highlighting after DOM is ready with word spans
      const startWordHighlighting = () => {
        let lastHighlightedWord = -1

        const updateHighlight = () => {
          if (!audio || audio.paused || audio.ended) return

          const currentTime = audio.currentTime
          let wordToHighlight = lastHighlightedWord

          for (let i = 0; i < wordTimestampsRef.current.length; i++) {
            const timestamp = wordTimestampsRef.current[i]
            if (currentTime >= timestamp.start && currentTime < timestamp.end) {
              wordToHighlight = i
              break
            }
            // Fill gaps between words to prevent flickering
            if (i < wordTimestampsRef.current.length - 1) {
              const nextTimestamp = wordTimestampsRef.current[i + 1]
              if (currentTime >= timestamp.end && currentTime < nextTimestamp.start) {
                wordToHighlight = i
                break
              }
            }
          }

          if (wordToHighlight !== lastHighlightedWord) {
            lastHighlightedWord = wordToHighlight

            // Direct DOM manipulation for performance
            clearHighlight()

            if (contentContainerRef.current) {
              const wordSpan = contentContainerRef.current.querySelector(
                `[data-word-index="${wordToHighlight}"]`
              ) as HTMLElement | null
              if (wordSpan && !wordSpan.hasAttribute('data-skip-highlight')) {
                wordSpan.style.backgroundColor = '#fde7f4'
                wordSpan.style.padding = '2px'
                wordSpan.style.margin = '-2px'
                wordSpan.style.borderRadius = '2px'
                currentHighlightRef.current = wordSpan
              }
            }

            checkAndScrollToHeader(wordToHighlight)
          }

          // Check if past all words
          const lastTimestamp = wordTimestampsRef.current[wordTimestampsRef.current.length - 1]
          if (lastTimestamp && currentTime >= lastTimestamp.end) {
            clearHighlight()
            wordTimerRef.current = null
            return
          }

          wordTimerRef.current = requestAnimationFrame(updateHighlight)
        }

        wordTimerRef.current = requestAnimationFrame(updateHighlight)
      }

      // Wait for DOM to be painted with word spans before starting highlighting
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (audio.duration && !isNaN(audio.duration)) {
            startWordHighlighting()
          } else {
            audio.addEventListener('loadedmetadata', startWordHighlighting, { once: true })
          }
        })
      })
    } catch (error) {
      console.error('Error reading aloud:', error)
      onReadingChange(false)
      clearHighlight()
    }
  }, [isReading, audioUrl, onReadingChange, clearHighlight, checkAndScrollToHeader, contentContainerRef])

  const durationMinutes = durationSeconds ? Math.ceil(durationSeconds / 60) : null

  return (
    <div className="max-w-4xl mx-auto px-6 pt-4 flex justify-center">
      <div className="flex items-center gap-3 w-full" style={{ maxWidth: '762px' }}>
        <button
          onClick={handleToggleReading}
          className="rounded-lg flex items-center justify-center transition text-white"
          style={{
            backgroundColor: isReading ? '#D10A64' : '#EF0B72',
            width: '34px',
            height: '34px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#D10A64' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isReading ? '#D10A64' : '#EF0B72' }}
          title={isReading ? 'Pause narration' : 'Listen to article'}
        >
          {isReading ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
        <span style={{ fontSize: '1.05rem', fontWeight: 300, color: '#000000' }}>
          {durationMinutes ? `${durationMinutes} minute narration` : ''}
        </span>
      </div>
    </div>
  )
}
