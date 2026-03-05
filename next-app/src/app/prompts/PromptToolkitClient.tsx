'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import { createClient } from '@/lib/supabase/client'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'
import type { Prompt } from '@/data/placeholderPrompts'
import PromptColumn from '@/components/prompts/PromptColumn'
import PromptFilters from '@/components/prompts/PromptFilters'
import PromptContributeModal from './PromptContributeModal'

interface PromptToolkitClientProps {
  professions: string[]
  prompts: Prompt[]
  initialProfession?: string
  pageTitle?: string
}

const FILTERS_STORAGE_KEY = 'ignite_prompt_filters'

function loadSavedFilters(): { search: string; professions: string[]; tools: string[]; complexities: string[] } | null {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function PromptToolkitClient({ professions, prompts, initialProfession, pageTitle }: PromptToolkitClientProps) {
  const saved = useMemo(() => initialProfession ? null : loadSavedFilters(), [])
  const [searchQuery, setSearchQuery] = useState(saved?.search ?? '')
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>(
    initialProfession ? [initialProfession] : (saved?.professions ?? [])
  )
  const [selectedTools, setSelectedTools] = useState<string[]>(saved?.tools ?? [])
  const [selectedComplexities, setSelectedComplexities] = useState<string[]>(saved?.complexities ?? [])
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null)
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const loopCountRef = useRef(0)

  // Check auth state on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setIsAuthenticated(true)
      setAuthLoaded(true)
    })
  }, [])

  // Google One Tap sign-in (no redirect, just update auth state)
  const handleGoogleSuccess = useCallback(async (credential: string, nonce: string) => {
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
        nonce: nonce,
      })

      if (authError || !data.user) {
        console.error('[PromptToolkit] Google sign-in failed:', authError)
        return
      }

      setIsAuthenticated(true)
    } catch (err) {
      console.error('[PromptToolkit] Unexpected error:', err)
    }
  }, [])

  useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: authLoaded && !isAuthenticated,
    autoPrompt: true,
  })

  // Persist filter selections to localStorage (skip on profession subpages)
  useEffect(() => {
    if (initialProfession) return
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
        search: searchQuery,
        professions: selectedProfessions,
        tools: selectedTools,
        complexities: selectedComplexities,
      }))
    } catch {}
  }, [searchQuery, selectedProfessions, selectedTools, selectedComplexities, initialProfession])

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
    return prompts.filter((prompt) => {
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

  const showContributeButton = filteredPrompts.length === 0 && searchQuery.trim().length > 0

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
        <div className={`text-center ${pageTitle ? 'mb-[15px]' : 'mb-[7px]'}`}>
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
            className="text-[38px] font-bold text-black mb-[6px] tracking-[-0.02em] leading-tight"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', marginTop: '-12px' }}
          >
            AI Prompt Toolkit
            {pageTitle && (
              <>
                <br />
                <span>{pageTitle.replace('AI Prompt Toolkit ', '')}</span>
              </>
            )}
          </h1>
        </div>

        {/* Description and Search */}
        <div className="mb-5">
          <p
            className="text-black max-w-[480px] mx-auto leading-normal text-center mb-[25px]"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', letterSpacing: '-0.01em' }}
          >
            Discover the best AI prompts for Claude, Co-Pilot, ChatGPT
            {'\n'}and Gemini to make your daily work tasks easier with better outcomes.
          </p>
          <div
            className="w-full max-w-[660px] mx-auto relative group"
            onMouseEnter={() => {
              const input = document.querySelector<HTMLInputElement>('.prompt-search-input')
              if (input) input.style.boxShadow = '0 0 10px rgba(103,103,103,0.75)'
            }}
            onMouseLeave={() => {
              const input = document.querySelector<HTMLInputElement>('.prompt-search-input')
              if (input) input.style.boxShadow = '0 0 10px rgba(103,103,103,0.6)'
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder=""
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && showContributeButton) {
                  e.preventDefault()
                  setShowContributeModal(true)
                }
              }}
              className="prompt-search-input w-full bg-white rounded-xl px-6 py-3 text-gray-900 caret-[#EF0B72] focus:outline-none transition-all"
              style={{
                boxShadow: '0 0 10px rgba(103,103,103,0.6)',
                paddingRight: showContributeButton ? '175px' : '24px',
              }}
            />
            <button
              type="button"
              onClick={() => setShowContributeModal(true)}
              className="absolute right-1 top-0 bottom-0 my-auto flex items-center gap-2 bg-[#EBEBEB]/80 rounded-lg pl-3 pr-1.5 cursor-pointer"
              style={{
                height: 'fit-content',
                paddingTop: '6px',
                paddingBottom: '6px',
                opacity: showContributeButton ? 1 : 0,
                transform: showContributeButton ? 'scale(1)' : 'scale(0.9)',
                pointerEvents: showContributeButton ? 'auto' : 'none',
                transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <span
                className="text-black font-semibold text-sm tracking-[-0.01em]"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                Contribute
              </span>
              <div
                className="bg-white rounded-md flex items-center justify-center"
                style={{ width: '28px', height: '28px' }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-black group-hover:text-[#EF0B72] transition-colors"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </button>
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

      {showContributeModal && (
        <PromptContributeModal
          professions={professions}
          initialTitle={searchQuery}
          onClose={() => { setShowContributeModal(false); setTimeout(() => setSearchQuery(''), 150) }}
        />
      )}
    </div>
  )
}
