'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import { placeholderPrompts } from '@/data/placeholderPrompts'
import PromptColumn from '@/components/prompts/PromptColumn'
import PromptFilters from '@/components/prompts/PromptFilters'

interface PromptToolkitClientProps {
  professions: string[]
}

export default function PromptToolkitClient({ professions }: PromptToolkitClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([])
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [selectedComplexities, setSelectedComplexities] = useState<string[]>([])
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null)
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const loopCountRef = useRef(0)

  // Load Lottie animation
  useEffect(() => {
    fetch('/icon-animation.json')
      .then(res => res.json())
      .then(data => setLottieData(data))
      .catch(() => {})
  }, [])

  // Delayed Lottie start (2s delay, 3 loops with pause)
  useEffect(() => {
    if (lottieData && lottieRef.current) {
      const timer = setTimeout(() => {
        lottieRef.current?.play()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [lottieData])

  // Filter prompts based on search and filters
  const filteredPrompts = useMemo(() => {
    return placeholderPrompts.filter((prompt) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          prompt.title.toLowerCase().includes(query) ||
          prompt.description.toLowerCase().includes(query) ||
          prompt.profession.toLowerCase().includes(query) ||
          prompt.llmTools.some(t => t.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // Profession filter
      if (selectedProfessions.length > 0 && !selectedProfessions.includes(prompt.profession)) return false

      // LLM Tool filter
      if (selectedTools.length > 0 && !prompt.llmTools.some(t => selectedTools.includes(t))) return false

      // Complexity filter
      if (selectedComplexities.length > 0 && !selectedComplexities.includes(prompt.complexity)) return false

      return true
    })
  }, [searchQuery, selectedProfessions, selectedTools, selectedComplexities])

  // Sort prompts for each column
  const mostUsed = useMemo(
    () => [...filteredPrompts].sort((a, b) => b.usageCount - a.usageCount),
    [filteredPrompts]
  )

  const highlyRated = useMemo(
    () => [...filteredPrompts].sort((a, b) => b.rating - a.rating || b.usageCount - a.usageCount),
    [filteredPrompts]
  )

  const mostRecent = useMemo(
    () => [...filteredPrompts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filteredPrompts]
  )

  return (
    <div className="bg-white pb-12">
      <div className="max-w-[1330px] mx-auto px-6">
        {/* Header with Lottie logo */}
        <div className="text-center mb-[7px]">
          <Link href="/" className="inline-block" style={{ marginBottom: '28.8px' }}>
            {lottieData ? (
              <Lottie
                lottieRef={lottieRef}
                animationData={lottieData}
                loop={true}
                autoplay={false}
                onLoopComplete={() => {
                  loopCountRef.current += 1
                  if (loopCountRef.current % 3 === 0 && lottieRef.current) {
                    lottieRef.current.pause()
                    setTimeout(() => {
                      lottieRef.current?.goToAndPlay(0)
                    }, 4000)
                  }
                }}
                style={{ width: 80, height: 80, margin: '0 auto' }}
              />
            ) : (
              <div style={{ width: 80, height: 80, margin: '0 auto' }} />
            )}
          </Link>
          <h1
            className="text-[38px] font-bold text-black mb-[6px] tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', marginTop: '-12px' }}
          >
            AI Prompt Toolkit
          </h1>
        </div>

        {/* Description and Search */}
        <div className="mb-5">
          <p
            className="text-black max-w-[480px] mx-auto leading-normal text-center mb-[25px]"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', letterSpacing: '-0.01em' }}
          >
            Discover the best LLM prompts for Claude, Co-Pilot, ChatGPT
            {'\n'}and Gemini to make your daily work tasks easier with better outcomes.
          </p>
          <div className="w-full max-w-[660px] mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder=""
              autoFocus
              className="w-full bg-white rounded-xl px-6 py-3 text-gray-900 caret-[#EF0B72] focus:outline-none transition-all"
              style={{ boxShadow: '0 0 10px rgba(103,103,103,0.6)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 10px rgba(103,103,103,0.75)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 10px rgba(103,103,103,0.6)'
              }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-[50px]">
          <PromptFilters
            professions={professions}
            selectedProfessions={selectedProfessions}
            selectedTools={selectedTools}
            selectedComplexities={selectedComplexities}
            onProfessionsChange={setSelectedProfessions}
            onToolsChange={setSelectedTools}
            onComplexitiesChange={setSelectedComplexities}
          />
        </div>

        {/* Prompt Columns - 3 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[35px]">
          <PromptColumn type="most-used" prompts={mostUsed} />
          <PromptColumn type="highly-rated" prompts={highlyRated} />
          <PromptColumn type="most-recent" prompts={mostRecent} />
        </div>
      </div>

    </div>
  )
}
