'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'
import useTypingAnimation from '@/hooks/useTypingAnimation'
import { saveGoogleProfileHint, getGoogleProfileHint, type GoogleProfileHint } from '@/lib/googleProfileHint'
import type { User } from '@supabase/supabase-js'
import type { Prompt } from '@/data/placeholderPrompts'

interface PromptDetailClientProps {
  prompt: Prompt
  slug: string
}

// Tools that support deep linking with prompt pre-filled
const LLM_DEEP_LINK_URLS: Record<string, string> = {
  'Claude': 'https://claude.ai/new?q=',
  'ChatGPT': 'https://chatgpt.com/?q=',
}

// Tools that don't support deep linking — copy to clipboard then open site
const LLM_SITE_URLS: Record<string, string> = {
  'Co-Pilot': 'https://copilot.microsoft.com/',
  'Gemini': 'https://gemini.google.com/app',
}

const LLM_LOGO_PATHS: Record<string, string> = {
  'Claude': 'https://auth.ignite.education/storage/v1/object/public/assets/Claude_AI_symbol.svg.png',
  'ChatGPT': 'https://auth.ignite.education/storage/v1/object/public/assets/1024px-ChatGPT-Logo%20(1).png',
  'Co-Pilot': 'https://auth.ignite.education/storage/v1/object/public/assets/copilot-color.png',
  'Gemini': 'https://auth.ignite.education/storage/v1/object/public/assets/Google_Gemini_icon_2025.svg',
}

function extractFirstName(user: { user_metadata?: Record<string, string>; email?: string }) {
  return user.user_metadata?.first_name
    || user.user_metadata?.full_name?.split(' ')[0]
    || user.user_metadata?.name?.split(' ')[0]
    || user.email?.split('@')[0]
    || 'your'
}

type PromptSegment =
  | { type: 'text'; content: string }
  | { type: 'placeholder'; content: string; index: number }

function parsePromptSegments(fullPrompt: string): PromptSegment[] {
  const regex = /\[([^\]]+)\]/g
  const segments: PromptSegment[] = []
  let lastIndex = 0
  let placeholderIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(fullPrompt)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: fullPrompt.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'placeholder', content: match[1], index: placeholderIndex++ })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < fullPrompt.length) {
    segments.push({ type: 'text', content: fullPrompt.slice(lastIndex) })
  }

  return segments
}

function InlinePlaceholderInput({
  placeholderText,
  value,
  onChange,
  autoFocus,
}: {
  placeholderText: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  const measureRef = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState<number>(0)

  useEffect(() => {
    if (measureRef.current) {
      measureRef.current.textContent = value || placeholderText
      setWidth(measureRef.current.scrollWidth + 12)
    }
  }, [value, placeholderText])

  return (
    <>
      <span
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'pre',
          fontFamily: 'var(--font-geist-sans), sans-serif',
          fontSize: '13px',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderText}
        aria-label={placeholderText}
        autoFocus={autoFocus}
        style={{
          fontFamily: 'var(--font-geist-sans), sans-serif',
          fontSize: '13px',
          lineHeight: 'inherit',
          width: `${Math.max(width, 40)}px`,
          backgroundColor: '#FFFFFF',
          color: '#000000',
          border: 'none',
          borderRadius: '4px',
          padding: '0px 4px',
          margin: '2px 1px',
          outline: 'none',
          verticalAlign: 'baseline',
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 1px #7714E0'
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </>
  )
}

export default function PromptDetailClient({ prompt, slug }: PromptDetailClientProps) {
  const [user, setUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [copiedTool, setCopiedTool] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [googleHint, setGoogleHint] = useState<GoogleProfileHint | null>(null)
  const [placeholderValues, setPlaceholderValues] = useState<Record<number, string>>({})

  const segments = useMemo(() => parsePromptSegments(prompt.fullPrompt), [prompt.fullPrompt])

  const handlePlaceholderChange = useCallback((index: number, value: string) => {
    setPlaceholderValues(prev => ({ ...prev, [index]: value }))
  }, [])

  const buildFinalPrompt = useCallback((): string => {
    return segments.map(seg => {
      if (seg.type === 'text') return seg.content
      const userValue = placeholderValues[seg.index]
      return userValue && userValue.trim() !== '' ? userValue : `[${seg.content}]`
    }).join('')
  }, [segments, placeholderValues])

  const visibleTitle = `${prompt.title} - AI Prompt`
  const { displayText: displayedTitle, isComplete: isTypingComplete } = useTypingAnimation(
    visibleTitle,
    {
      charDelay: 75,
      startDelay: 750,
      enabled: true,
    }
  )
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const linkCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedToolTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shareUrl = `https://ignite.education/prompts/${slug}`

  // Check for stored Google profile on mount
  useEffect(() => {
    setGoogleHint(getGoogleProfileHint())
  }, [])

  // Handle Google sign-in success (direct, no redirect)
  const handleGoogleSuccess = useCallback(async (credential: string, nonce: string) => {
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
        nonce: nonce,
      })

      if (authError || !data.user) {
        console.error('[PromptDetail] Google sign-in failed:', authError)
        return
      }

      // Save Google profile for future personalization
      saveGoogleProfileHint(data.user)

      setUser(data.user)
      setFirstName(extractFirstName(data.user))
      setCheckingStatus(false)

      // Auto-save the prompt
      const supabase2 = createClient()
      const { data: existing } = await supabase2
        .from('saved_prompts')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('prompt_id', prompt.id)
        .maybeSingle()

      if (!existing) {
        await supabase2
          .from('saved_prompts')
          .insert({ user_id: data.user.id, prompt_id: prompt.id })
      }
      setSaved(true)
    } catch (err) {
      console.error('[PromptDetail] Unexpected error:', err)
    }
  }, [prompt.id])

  const { isLoaded, renderButton, triggerPrompt } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: !user,
    autoPrompt: false,
    loginHint: googleHint?.email,
  })

  // Render Google GIS button when ready (only for first-time users without stored profile)
  useEffect(() => {
    if (!user && !googleHint && isLoaded && googleBtnRef.current) {
      const containerWidth = googleBtnRef.current.offsetWidth
      renderButton(googleBtnRef.current, {
        width: containerWidth,
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
      })
    }
  }, [user, googleHint, isLoaded, renderButton])

  // Handle custom personalized Google button click
  const handlePersonalizedGoogleClick = useCallback(() => {
    triggerPrompt(() => {
      // Prompt was blocked (Safari ITP) — fall back to OAuth redirect
      sessionStorage.setItem('pendingSavePrompt', prompt.id)
      const supabase = createClient()
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href,
          queryParams: googleHint?.email ? { login_hint: googleHint.email } : undefined,
        },
      })
    })
  }, [triggerPrompt, prompt.id, googleHint])

  // Handle LinkedIn sign-in (OAuth redirect)
  const handleLinkedInClick = useCallback(async () => {
    sessionStorage.setItem('pendingSavePrompt', prompt.id)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: window.location.href,
      },
    })
  }, [prompt.id])

  // Initial auth check + OAuth callback detection
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        setFirstName(extractFirstName(user))

        // Check for pending save (OAuth redirect)
        const pendingPromptId = sessionStorage.getItem('pendingSavePrompt')
        if (pendingPromptId === prompt.id) {
          sessionStorage.removeItem('pendingSavePrompt')
          const { data: existing } = await supabase
            .from('saved_prompts')
            .select('id')
            .eq('user_id', user.id)
            .eq('prompt_id', prompt.id)
            .maybeSingle()

          if (!existing) {
            await supabase
              .from('saved_prompts')
              .insert({ user_id: user.id, prompt_id: prompt.id })
          }
          setSaved(true)
          setCheckingStatus(false)
          return
        }

        // Check if prompt is already saved
        const { data } = await supabase
          .from('saved_prompts')
          .select('id')
          .eq('user_id', user.id)
          .eq('prompt_id', prompt.id)
          .maybeSingle()
        setSaved(!!data)
        setCheckingStatus(false)
      } else {
        setCheckingStatus(false)
      }
      setAuthLoaded(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setFirstName(extractFirstName(session.user))
      } else {
        setFirstName(null)
        setSaved(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [prompt.id])

  const handleSaveToggle = async () => {
    if (!user) return
    setSaving(true)

    try {
      const supabase = createClient()
      if (saved) {
        await supabase
          .from('saved_prompts')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', prompt.id)
        setSaved(false)
      } else {
        await supabase
          .from('saved_prompts')
          .insert({ user_id: user.id, prompt_id: prompt.id })
        setSaved(true)
      }
    } catch (err) {
      console.error('Error toggling save status:', err)
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }

  const handleOpenTool = async (tool: string) => {
    const finalPrompt = buildFinalPrompt()
    const deepLinkUrl = LLM_DEEP_LINK_URLS[tool]
    if (deepLinkUrl) {
      window.open(deepLinkUrl + encodeURIComponent(finalPrompt), '_blank')
      return
    }

    const siteUrl = LLM_SITE_URLS[tool]
    if (siteUrl) {
      await copyToClipboard(finalPrompt)
      setCopiedTool(tool)
      if (copiedToolTimeoutRef.current) clearTimeout(copiedToolTimeoutRef.current)
      copiedToolTimeoutRef.current = setTimeout(() => setCopiedTool(null), 3000)
      window.open(siteUrl, '_blank')
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setLinkCopied(true)
    if (linkCopyTimeoutRef.current) clearTimeout(linkCopyTimeoutRef.current)
    linkCopyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleLinkedInShare = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  const handleWhatsAppShare = () => {
    const text = `Check out this AI prompt: ${prompt.title} on Ignite Education`
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank')
  }

  const handleSubstackShare = () => {
    window.open(`https://substack.com/note?url=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  const tags = [
    prompt.profession,
    ...prompt.llmTools,
    `${prompt.complexity} Complexity`,
  ]

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      {/* Title with typing animation */}
      <h1
        className="text-[38px] font-bold text-black leading-tight text-center mb-[15px]"
        style={{ letterSpacing: '-0.02em' }}
      >
        <span style={{ display: 'inline-block', textAlign: 'left' }}>
          {displayedTitle}
          {!isTypingComplete && (
            <span style={{ opacity: 0 }}>{visibleTitle.substring(displayedTitle.length)}</span>
          )}
        </span>
      </h1>

      {/* Description */}
      <p
        className="text-black text-lg leading-normal font-normal text-center mx-auto"
        style={{ letterSpacing: '-0.02em', marginBottom: '30px', maxWidth: '610px', textWrap: 'balance' }}
      >
        {prompt.description}
      </p>

      {/* Tags */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-block text-sm font-medium px-[11px] py-[6px] rounded-[6px] bg-[#F0F0F0] text-[#7714E0]"
            style={{ letterSpacing: '-0.02em' }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="lg:-mx-24">
      <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
        Prompt
      </h2>

      <div className="flex gap-6 items-stretch">
      {/* LEFT COLUMN — Grey prompt container (matches curriculum grey box) */}
      <div className="bg-[#F0F0F2] p-6 rounded-lg flex-1 min-w-0 relative">
          <pre
            className="text-sm text-black whitespace-pre-wrap leading-relaxed relative"
            style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px' }}
          >
            {segments.map((seg, i) =>
              seg.type === 'text' ? (
                <span key={i}>{seg.content}</span>
              ) : (
                <InlinePlaceholderInput
                  key={`placeholder-${seg.index}`}
                  placeholderText={seg.content}
                  value={placeholderValues[seg.index] || ''}
                  onChange={(val) => handlePlaceholderChange(seg.index, val)}
                  autoFocus={seg.index === 0}
                />
              )
            )}
          </pre>
          <button
            onClick={() => copyToClipboard(buildFinalPrompt())}
            className="absolute bottom-3 right-3 p-1.5 cursor-pointer group"
            aria-label="Copy prompt"
          >
            <svg className="w-5 h-5 text-black group-hover:text-[#EF0B72] transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
      </div>

      {/* RIGHT COLUMN — Sticky Sidebar (hidden on mobile) */}
      <div className="flex-shrink-0 hidden lg:block self-stretch" style={{ width: '315px' }}>
        <div className="sticky top-24">
          <div className="w-full">
            {!user ? (
              <>
                {/* Sign-in buttons */}
                <div className="space-y-2 w-[90%] mx-auto mb-3">
                  {googleHint ? (
                    <button
                      onClick={handlePersonalizedGoogleClick}
                      className="mx-auto flex items-center bg-white border border-[#dadce0] rounded text-sm hover:bg-gray-50 transition cursor-pointer overflow-hidden"
                      style={{ width: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
                    >
                      {/* Avatar */}
                      <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                        {googleHint.avatar ? (
                          <img
                            src={googleHint.avatar}
                            alt=""
                            className="rounded-full"
                            style={{ width: '24px', height: '24px' }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            className="rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-medium"
                            style={{ width: '24px', height: '24px' }}
                          >
                            {googleHint.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Name and email */}
                      <div className="flex-1 text-left min-w-0 pr-1">
                        <span className="block text-[13px] font-medium text-[#3c4043] leading-tight truncate">
                          Continue as {googleHint.name}
                        </span>
                        <span className="block text-[11px] text-[#5f6368] leading-tight truncate">
                          {googleHint.email}
                        </span>
                      </div>
                      {/* Google logo */}
                      <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                      </div>
                    </button>
                  ) : (
                    /* Standard GIS button (for first-time users) */
                    <div
                      ref={googleBtnRef}
                      className="mx-auto rounded overflow-hidden"
                      style={{ width: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
                    />
                  )}

                  {/* LinkedIn Sign In Button */}
                  <button
                    onClick={handleLinkedInClick}
                    className="mx-auto flex items-center justify-center bg-[#0a66c2] text-white rounded text-sm hover:bg-[#084d93] transition font-medium cursor-pointer"
                    style={{ width: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
                  >
                    Continue with LinkedIn
                  </button>
                </div>

                {/* Status Text */}
                <p className="text-center text-black text-sm font-normal mb-4" style={{ letterSpacing: '-0.02em' }}>
                  Sign in to save the prompt
                </p>
              </>
            ) : (
              <>
                {/* Save to Account Button for authenticated users */}
                <div className="w-[80%] mx-auto mb-4">
                  <button
                    onClick={handleSaveToggle}
                    disabled={saving || checkingStatus}
                    className={`w-full px-4 transition-all duration-200 shadow-[0_0_10px_rgba(103,103,103,0.4)] ${
                      checkingStatus
                        ? 'bg-[#9E9E9E] text-white'
                        : saved
                        ? 'bg-[#009600] text-white hover:bg-[#007D00]'
                        : 'bg-[#EF0B72] text-white hover:bg-[#D10A64]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{ paddingTop: '0.575rem', paddingBottom: '0.575rem', borderRadius: '8px' }}
                  >
                    {checkingStatus ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span className="text-[1rem] font-medium" style={{ letterSpacing: '-0.02em' }}>Loading...</span>
                      </span>
                    ) : saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span className="text-[1rem] font-medium" style={{ letterSpacing: '-0.02em' }}>
                          {saved ? 'Removing...' : 'Saving...'}
                        </span>
                      </span>
                    ) : saved ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                          Saved to Account
                        </span>
                      </span>
                    ) : (
                      <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                        Add to {firstName || 'your'}&apos;s Account
                      </span>
                    )}
                  </button>

                  <p className="text-center text-black text-sm font-normal mt-3 min-h-[1.25rem]" style={{ letterSpacing: '-0.02em' }}>
                    {!checkingStatus && (saved ? 'Prompt saved to your account' : "We'll save this prompt for later")}
                  </p>
                </div>
              </>
            )}

            {/* Share Buttons Row */}
            <div className="flex items-center justify-center gap-2">
              {/* Copy Link Button */}
              <button
                onClick={handleCopyLink}
                className={`flex items-center justify-center gap-1.5 h-[30px] rounded-md transition-colors w-[85px] ${
                  linkCopied
                    ? 'bg-[#009600] text-white'
                    : 'bg-[#EDEDED] text-black hover:bg-[#E0E0E0]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-xs font-medium">{linkCopied ? 'Copied' : 'Copy link'}</span>
              </button>

              {/* LinkedIn Share */}
              <button
                onClick={handleLinkedInShare}
                className="w-[30px] h-[30px] flex items-center justify-center rounded-md bg-[#0A66C2] hover:bg-[#004182] transition-colors"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </button>

              {/* WhatsApp Share */}
              <button
                onClick={handleWhatsAppShare}
                className="w-[30px] h-[30px] flex items-center justify-center rounded-md bg-[#25D366] hover:bg-[#1DA851] transition-colors"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>

              {/* Substack Share */}
              <button
                onClick={handleSubstackShare}
                className="w-[30px] h-[30px] flex items-center justify-center rounded-md bg-[#FF6719] hover:bg-[#E55A14] transition-colors"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
                  <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Copy to LLM buttons — below the two-column flex, inside the -mx-24 wrapper */}
      <div className="flex items-center gap-2 flex-wrap mt-4">
        {prompt.llmTools.map((tool) => {
          const isCopied = copiedTool === tool
          return (
            <button
              key={tool}
              onClick={() => handleOpenTool(tool)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg font-normal transition-all cursor-pointer"
              style={{
                backgroundColor: isCopied ? '#009600' : 'white',
                color: isCopied ? 'white' : 'black',
                fontSize: '12px',
                letterSpacing: '-0.02em',
                boxShadow: isCopied ? 'none' : '0 0 6px rgba(103,103,103,0.25)',
              }}
              onMouseEnter={(e) => { if (!isCopied) e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.45)' }}
              onMouseLeave={(e) => { if (!isCopied) e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.25)' }}
            >
              {isCopied ? `Copied! Paste in ${tool}` : (LLM_SITE_URLS[tool] ? `Open ${tool}` : `Copy to ${tool}`)}
              {LLM_LOGO_PATHS[tool] && (
                <img src={LLM_LOGO_PATHS[tool]} alt={tool} width={tool === 'ChatGPT' ? 16 : 16} height={tool === 'ChatGPT' ? 16 : 16} />
              )}
            </button>
          )
        })}
      </div>
      </div>

      {/* Output Section — single-column below the two-column layout */}
      <div className="mt-10">
        <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
          Output
        </h2>
        <p className="text-black text-lg leading-relaxed font-normal" style={{ letterSpacing: '-0.02em' }}>
          {prompt.description}
        </p>
      </div>

      {/* Mobile CTA (shown below content on mobile, hidden on desktop) */}
      <div className="lg:hidden mt-8">
        {!user ? (
          <div className="space-y-2 w-full mb-3">
            {googleHint ? (
              <button
                onClick={handlePersonalizedGoogleClick}
                className="mx-auto flex items-center bg-white border border-[#dadce0] rounded text-sm hover:bg-gray-50 transition cursor-pointer overflow-hidden"
                style={{ width: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
              >
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                  {googleHint.avatar ? (
                    <img
                      src={googleHint.avatar}
                      alt=""
                      className="rounded-full"
                      style={{ width: '24px', height: '24px' }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-medium"
                      style={{ width: '24px', height: '24px' }}
                    >
                      {googleHint.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0 pr-1">
                  <span className="block text-[13px] font-medium text-[#3c4043] leading-tight truncate">
                    Continue as {googleHint.name}
                  </span>
                  <span className="block text-[11px] text-[#5f6368] leading-tight truncate">
                    {googleHint.email}
                  </span>
                </div>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                </div>
              </button>
            ) : (
              <div
                className="mx-auto rounded overflow-hidden"
                style={{ width: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
              />
            )}
            <button
              onClick={handleLinkedInClick}
              className="mx-auto flex items-center justify-center bg-[#0a66c2] text-white rounded text-sm hover:bg-[#084d93] transition font-medium cursor-pointer"
              style={{ width: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
            >
              Continue with LinkedIn
            </button>
            <p className="text-center text-black text-sm font-normal mt-1" style={{ letterSpacing: '-0.02em' }}>
              Sign in to save the prompt
            </p>
          </div>
        ) : (
          <div className="w-full mb-4">
            <button
              onClick={handleSaveToggle}
              disabled={saving || checkingStatus}
              className={`w-full px-4 transition-all duration-200 shadow-[0_0_10px_rgba(103,103,103,0.4)] ${
                checkingStatus
                  ? 'bg-[#9E9E9E] text-white'
                  : saved
                  ? 'bg-[#009600] text-white hover:bg-[#007D00]'
                  : 'bg-[#EF0B72] text-white hover:bg-[#D10A64]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ paddingTop: '0.575rem', paddingBottom: '0.575rem', borderRadius: '8px' }}
            >
              {checkingStatus ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-[1rem] font-medium" style={{ letterSpacing: '-0.02em' }}>Loading...</span>
                </span>
              ) : saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-[1rem] font-medium" style={{ letterSpacing: '-0.02em' }}>
                    {saved ? 'Removing...' : 'Saving...'}
                  </span>
                </span>
              ) : saved ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                    Saved to Account
                  </span>
                </span>
              ) : (
                <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                  Add to {firstName || 'your'}&apos;s Account
                </span>
              )}
            </button>
            <p className="text-center text-black text-sm font-normal mt-3 min-h-[1.25rem]" style={{ letterSpacing: '-0.02em' }}>
              {!checkingStatus && (saved ? 'Prompt saved to your account' : "We'll save this prompt for later")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
