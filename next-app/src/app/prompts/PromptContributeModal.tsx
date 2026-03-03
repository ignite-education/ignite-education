'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import useGoogleOneTap from '@/hooks/useGoogleOneTap'
import { createClient } from '@/lib/supabase/client'
import { saveGoogleProfileHint, getGoogleProfileHint, type GoogleProfileHint } from '@/lib/googleProfileHint'
import { LLM_TOOLS, COMPLEXITIES } from '@/data/placeholderPrompts'

interface PromptContributeModalProps {
  professions: string[]
  onClose: () => void
}

function extractFirstName(user: { user_metadata?: Record<string, string>; email?: string }) {
  return user.user_metadata?.full_name?.split(' ')[0]
    || user.user_metadata?.name?.split(' ')[0]
    || user.email?.split('@')[0]
    || 'there'
}

export default function PromptContributeModal({ professions, onClose }: PromptContributeModalProps) {
  const [closing, setClosing] = useState(false)
  const [phase, setPhase] = useState<'form' | 'sign-in' | 'thank-you'>('form')
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [googleHint, setGoogleHint] = useState<GoogleProfileHint | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fullPrompt, setFullPrompt] = useState('')
  const [profession, setProfession] = useState('')
  const [llmTools, setLlmTools] = useState<string[]>([])
  const [complexity, setComplexity] = useState<'Low' | 'Mid' | 'High' | ''>('')

  // Ref to auto-submit after sign-in completes
  const pendingSubmitRef = useRef(false)

  const isFormValid = title.trim() && description.trim() && fullPrompt.trim() && profession && llmTools.length > 0 && complexity

  // Check for stored Google profile on mount
  useEffect(() => {
    setGoogleHint(getGoogleProfileHint())
  }, [])

  // Silently check if already signed in (stay on form phase either way)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        setUserName(extractFirstName(user))
      }
    })
  }, [])

  const submitToDatabase = useCallback(async (uid: string, name: string) => {
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from('prompt_contributions').insert({
      user_id: uid,
      title: title.trim(),
      description: description.trim(),
      full_prompt: fullPrompt.trim(),
      profession,
      llm_tools: llmTools,
      complexity,
    })

    if (error) {
      console.error('[PromptContribute] Insert failed:', error.message, error.code)
      setSubmitting(false)
      return
    }

    setUserName(name)
    setPhase('thank-you')
  }, [title, description, fullPrompt, profession, llmTools, complexity])

  const handleFormSubmit = async () => {
    if (!isFormValid) return

    // If already signed in, submit directly
    if (userId) {
      await submitToDatabase(userId, userName)
      return
    }

    // Not signed in — transition to sign-in phase
    pendingSubmitRef.current = true
    setPhase('sign-in')
  }

  const startSigningIn = useCallback(() => {
    setSigningIn(true)
  }, [])

  const onAuthSuccess = useCallback(async (id: string, firstName: string) => {
    setUserId(id)
    setUserName(firstName)
    setSigningIn(false)
    // Auto-submit since form was already filled
    await submitToDatabase(id, firstName)
  }, [submitToDatabase])

  const openOAuthPopup = useCallback(async (
    provider: 'google' | 'linkedin_oidc',
    queryParams?: Record<string, string>
  ) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
        ...(queryParams ? { queryParams } : {}),
      },
    })

    if (error || !data?.url) {
      sessionStorage.setItem('pendingPromptContribution', 'true')
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.href },
      })
      return
    }

    const w = 500, h = 600
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    const popup = window.open(data.url, 'auth-popup', `width=${w},height=${h},left=${left},top=${top}`)

    if (!popup) {
      sessionStorage.setItem('pendingPromptContribution', 'true')
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.href },
      })
      return
    }

    // Poll for auth completion
    const interval = setInterval(async () => {
      if (popup.closed) {
        clearInterval(interval)
        setSigningIn(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        clearInterval(interval)
        popup.close()
        await supabase.auth.refreshSession()
        if (provider === 'google') saveGoogleProfileHint(user)
        onAuthSuccess(user.id, extractFirstName(user))
      }
    }, 500)
  }, [onAuthSuccess])

  const handleGoogleSuccess = useCallback(async (credential: string, nonce: string) => {
    startSigningIn()
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
        nonce: nonce,
      })

      if (authError || !data.user) {
        console.error('[PromptContribute] Google sign-in failed:', authError)
        setSigningIn(false)
        return
      }

      saveGoogleProfileHint(data.user)
      onAuthSuccess(data.user.id, extractFirstName(data.user))
    } catch (err) {
      console.error('[PromptContribute] Unexpected error:', err)
      setSigningIn(false)
    }
  }, [onAuthSuccess])

  const handleLinkedInClick = useCallback(async () => {
    startSigningIn()
    openOAuthPopup('linkedin_oidc')
  }, [openOAuthPopup])

  const { triggerPrompt } = useGoogleOneTap({
    onSuccess: handleGoogleSuccess,
    enabled: phase === 'sign-in',
    autoPrompt: false,
    loginHint: googleHint?.email,
  })

  const handleGoogleClick = useCallback(() => {
    startSigningIn()
    openOAuthPopup('google')
  }, [openOAuthPopup])

  const handlePersonalizedGoogleClick = useCallback(() => {
    startSigningIn()
    triggerPrompt(() => {
      openOAuthPopup('google', googleHint?.email ? { login_hint: googleHint.email } : undefined)
    })
  }, [triggerPrompt, googleHint])

  const toggleLlmTool = (tool: string) => {
    setLlmTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool])
  }

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isCompact = phase === 'sign-in' || phase === 'thank-you'

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${closing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      style={{
        backdropFilter: 'blur(2.4px)',
        WebkitBackdropFilter: 'blur(2.4px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        className={`relative bg-white flex flex-col ${closing ? 'animate-scaleDown' : 'animate-scaleUp'}`}
        style={{
          width: isCompact ? 'fit-content' : '540px',
          minWidth: isCompact ? '575px' : undefined,
          maxWidth: '90vw',
          maxHeight: '90vh',
          padding: isCompact ? '0 2.75rem' : '2rem 2.75rem',
          borderRadius: '6px',
          ...(isCompact ? { height: '350px' } : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {phase === 'form' ? (
          <div className="flex flex-col overflow-y-auto" style={{ gap: '14px' }}>
            <h3
              className="text-[1.4rem] font-bold text-black text-center leading-tight tracking-[-0.02em] pt-1"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
            >
              Contribute a Prompt
            </h3>

            {/* Title */}
            <div>
              <label
                className="block text-sm font-medium text-black tracking-[-0.01em] mb-1"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekly Report Generator"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#EF0B72] transition-colors"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              />
            </div>

            {/* Description */}
            <div>
              <label
                className="block text-sm font-medium text-black tracking-[-0.01em] mb-1"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what the prompt does"
                rows={2}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#EF0B72] transition-colors resize-none"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              />
            </div>

            {/* Full Prompt */}
            <div>
              <label
                className="block text-sm font-medium text-black tracking-[-0.01em] mb-1"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                Full Prompt
              </label>
              <textarea
                value={fullPrompt}
                onChange={(e) => setFullPrompt(e.target.value)}
                placeholder="The complete prompt text..."
                rows={5}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#EF0B72] transition-colors resize-none"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              />
            </div>

            {/* Profession */}
            <div>
              <label
                className="block text-sm font-medium text-black tracking-[-0.01em] mb-1"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                Profession
              </label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#EF0B72] transition-colors"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                <option value="">Select a profession</option>
                {professions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* LLM Tools */}
            <div>
              <label
                className="block text-sm font-medium text-black tracking-[-0.01em] mb-1.5"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                LLM Tools
              </label>
              <div className="flex flex-wrap gap-2">
                {LLM_TOOLS.map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggleLlmTool(tool)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      llmTools.includes(tool)
                        ? 'bg-[#EF0B72] text-white'
                        : 'bg-gray-100 text-black hover:bg-gray-200'
                    }`}
                    style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            {/* Complexity */}
            <div>
              <label
                className="block text-sm font-medium text-black tracking-[-0.01em] mb-1.5"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                Complexity
              </label>
              <div className="flex gap-2">
                {COMPLEXITIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setComplexity(level)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      complexity === level
                        ? 'bg-[#EF0B72] text-white'
                        : 'bg-gray-100 text-black hover:bg-gray-200'
                    }`}
                    style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={handleFormSubmit}
              disabled={!isFormValid || submitting}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer mt-1 mb-1"
              style={{
                fontFamily: 'var(--font-geist-sans), sans-serif',
                backgroundColor: isFormValid && !submitting ? '#EF0B72' : '#E5E7EB',
                color: isFormValid && !submitting ? 'white' : '#9CA3AF',
              }}
            >
              {submitting ? (
                <svg className="animate-spin mx-auto" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#ffffff80" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                'Submit Prompt'
              )}
            </button>
          </div>
        ) : phase === 'sign-in' ? (
          <>
            {/* Top section — 35% height */}
            <div className="flex items-end justify-center" style={{ flex: '0 0 35%' }}>
              <h3
                className="text-[1.65rem] font-bold text-black text-center leading-tight tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
              >
                Contribute a Prompt
              </h3>
            </div>

            {/* Bottom section — 65% height */}
            <div className="flex flex-col items-center justify-center" style={{ flex: '0 0 65%', paddingBottom: '10px' }}>
              {signingIn || submitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {googleHint ? (
                      <button
                        onClick={handlePersonalizedGoogleClick}
                        className="mx-auto flex items-center bg-white border border-[#dadce0] rounded text-sm hover:bg-gray-50 transition cursor-pointer overflow-hidden"
                        style={{ width: '380px', maxWidth: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
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
                      <button
                        onClick={handleGoogleClick}
                        className="mx-auto flex items-center bg-white border border-[#dadce0] rounded text-sm hover:bg-gray-50 transition cursor-pointer overflow-hidden"
                        style={{ width: '380px', maxWidth: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
                      >
                        <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                          </svg>
                        </div>
                        <span className="flex-1 text-center text-[14px] font-medium text-[#3c4043]">Continue with Google</span>
                      </button>
                    )}

                    <button
                      onClick={handleLinkedInClick}
                      className="mx-auto flex items-center bg-[#0077B5] text-white rounded text-sm hover:bg-[#006097] transition font-medium cursor-pointer"
                      style={{ width: '380px', maxWidth: '100%', height: '40px', boxShadow: '0 0 10px rgba(103,103,103,0.4)' }}
                    >
                      {googleHint ? (
                        <>
                          <span className="flex-1 text-left pl-3">Continue with LinkedIn</span>
                          <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </div>
                          <span className="flex-1 text-center">Continue with LinkedIn</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p
                    className="text-black text-center mt-6 text-[0.9rem] font-normal tracking-[-0.01em]"
                    style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                  >
                    Sign in to submit your prompt<br />to the community toolkit
                  </p>
                </>
              )}
            </div>
          </>
        ) : (
          /* Thank-you phase */
          <div className="flex flex-col items-center justify-center animate-fadeIn" style={{ height: '100%' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-4">
              <circle cx="12" cy="12" r="11" stroke="#009600" strokeWidth="2" />
              <path d="M7 12.5l3 3 7-7" stroke="#009600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p
              className="text-[#009600] text-center text-[1rem] font-semibold tracking-[-0.02em] leading-tight"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
            >
              <span className="text-[1.2rem]">Thank you, {userName}</span><br />
              <span className="font-normal text-black" style={{ marginTop: '10px', display: 'inline-block' }}>
                Your prompt has been submitted<br />for review
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
