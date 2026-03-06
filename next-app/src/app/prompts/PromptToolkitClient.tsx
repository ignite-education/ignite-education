'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import type { LottieRefCurrentProps } from 'lottie-react'
import type { User } from '@supabase/supabase-js'
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
  // === DEBUG: Catch mystery 404 ===
  useEffect(() => {
    // 1. Catch all resource load errors (images, scripts, stylesheets, etc.)
    const handleError = (e: Event) => {
      const target = e.target as HTMLElement
      if (target && target !== (window as unknown)) {
        const src = (target as HTMLImageElement).src || (target as HTMLScriptElement).src || (target as HTMLLinkElement).href
        console.error('[DEBUG 404] Resource load error:', {
          tagName: target.tagName,
          src,
          id: target.id,
          className: target.className,
          outerHTML: target.outerHTML?.slice(0, 200),
        })
      }
    }
    window.addEventListener('error', handleError, true) // capture phase to catch resource errors

    // 2. Patch fetch to log all requests and flag 404s
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url
      const response = await originalFetch(...args)
      if (response.status === 404) {
        console.error('[DEBUG 404] fetch returned 404:', {
          url,
          status: response.status,
          stack: new Error().stack,
        })
      }
      return response
    }

    // 3. Patch XMLHttpRequest to catch older-style requests
    const originalOpen = XMLHttpRequest.prototype.open
    const originalSend = XMLHttpRequest.prototype.send
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
      (this as XMLHttpRequest & { _debugUrl: string })._debugUrl = typeof url === 'string' ? url : url.toString()
      return originalOpen.call(this, method, url, ...(rest as [boolean, string?, string?]))
    }
    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener('load', () => {
        if (this.status === 404) {
          console.error('[DEBUG 404] XHR returned 404:', {
            url: (this as XMLHttpRequest & { _debugUrl: string })._debugUrl,
            status: this.status,
            responseURL: this.responseURL,
            stack: new Error().stack,
          })
        }
      })
      return originalSend.apply(this, args as [Document | XMLHttpRequestBodyInit | null | undefined])
    }

    // 4. Log all current resource hints (preload/prefetch links)
    const resourceHints = document.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"]')
    if (resourceHints.length > 0) {
      console.log('[DEBUG 404] Resource hints on page:', Array.from(resourceHints).map(l => ({
        rel: l.getAttribute('rel'),
        href: l.getAttribute('href'),
        as: l.getAttribute('as'),
      })))
    }

    return () => {
      window.removeEventListener('error', handleError, true)
      window.fetch = originalFetch
      XMLHttpRequest.prototype.open = originalOpen
      XMLHttpRequest.prototype.send = originalSend
    }
  }, [])
  // === END DEBUG ===

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>(
    initialProfession ? [initialProfession] : []
  )
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [selectedComplexities, setSelectedComplexities] = useState<string[]>([])

  // Restore saved filters from localStorage after hydration (avoids SSR mismatch)
  useEffect(() => {
    if (initialProfession) return
    const saved = loadSavedFilters()
    if (!saved) return
    setSearchQuery(saved.search)
    setSelectedProfessions(saved.professions)
    setSelectedTools(saved.tools)
    setSelectedComplexities(saved.complexities)
  }, [])
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null)
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const loopCountRef = useRef(0)

  // Check auth state on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAuthUser(user)
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

      setAuthUser(data.user)
    } catch (err) {
      console.error('[PromptToolkit] Unexpected error:', err)
    }
  }, [])

  useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: authLoaded && !authUser,
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
          <div className="flex items-center justify-center gap-3 mx-auto px-6">
            <div
              className="w-full max-w-[660px] relative group"
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
            <button
              type="button"
              onClick={() => setShowContributeModal(true)}
              className="group flex-shrink-0 bg-white rounded-xl flex items-center justify-center cursor-pointer shadow-[0_0_10px_rgba(103,103,103,0.6)] hover:shadow-[0_0_10px_rgba(103,103,103,0.75)] transition-shadow"
              style={{ width: '48px', height: '48px' }}
            >
              <svg width="18.7" height="18.7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-[#EF0B72] transition-colors">
                <path d="M4 13.5V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-5.5" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M10.42 12.61a2.1 2.1 0 1 1 2.97 2.97L7.95 21 4 22l1-3.96 5.42-5.43Z" />
              </svg>
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
          user={authUser}
          onClose={() => { setShowContributeModal(false); setTimeout(() => setSearchQuery(''), 150) }}
        />
      )}
    </div>
  )
}
