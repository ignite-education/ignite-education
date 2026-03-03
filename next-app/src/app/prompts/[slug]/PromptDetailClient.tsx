'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Prompt } from '@/data/placeholderPrompts'

interface PromptDetailClientProps {
  prompt: Prompt
  slug: string
}

const LLM_URLS: Record<string, string> = {
  'Claude': 'https://claude.ai/new?q=',
  'ChatGPT': 'https://chatgpt.com/?q=',
  'Co-Pilot': 'https://copilot.microsoft.com/?q=',
  'Gemini': 'https://gemini.google.com/app?q=',
}

const LLM_ICONS: Record<string, string> = {
  'Claude': '\u2728',
  'ChatGPT': '\uD83D\uDCAC',
  'Co-Pilot': '\uD83D\uDE80',
  'Gemini': '\u2B50',
}

export default function PromptDetailClient({ prompt, slug }: PromptDetailClientProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const linkCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shareUrl = `https://ignite.education/prompts/${slug}`

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        const avatarUrl = user.user_metadata?.custom_avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
        setProfilePicture(avatarUrl)
        setFirstName(user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0])
        checkIfSaved(user.id)
      }
      setAuthLoaded(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const avatarUrl = session.user.user_metadata?.custom_avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
        setProfilePicture(avatarUrl)
        setFirstName(session.user.user_metadata?.first_name || session.user.user_metadata?.name?.split(' ')[0])
        checkIfSaved(session.user.id)
      } else {
        setProfilePicture(null)
        setFirstName(null)
        setSaved(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkIfSaved = async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('saved_prompts')
      .select('id')
      .eq('user_id', userId)
      .eq('prompt_id', prompt.id)
      .single()
    if (data) setSaved(true)
  }

  const handleSaveToggle = async () => {
    if (!user) return
    setSaving(true)
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
    setSaving(false)
  }

  const handleOpenTool = (tool: string) => {
    const baseUrl = LLM_URLS[tool]
    if (!baseUrl) return
    window.open(baseUrl + encodeURIComponent(prompt.fullPrompt), '_blank')
  }

  const handleOAuthSignIn = async (provider: 'google' | 'linkedin_oidc') => {
    setOauthLoading(true)
    const siteUrl = window.location.origin
    const currentPath = `/prompts/${slug}`

    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(currentPath)}`,
      },
    })
    if (error) {
      console.error(error)
      setOauthLoading(false)
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

  const tags = [
    prompt.profession,
    ...prompt.llmTools,
    `${prompt.complexity} Complexity`,
  ]

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 lg:gap-16 items-start"
      style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
    >
      {/* LEFT COLUMN */}
      <div>
        {/* Title */}
        <h1
          className="text-[2.25rem] font-bold text-black tracking-[-0.02em] mb-3 leading-tight"
        >
          {prompt.title}
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-[0.95rem] leading-relaxed mb-5">
          {prompt.description}
        </p>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap mb-8">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-block text-xs font-semibold px-3 py-1.5 rounded-[5px] border"
              style={{
                color: '#7500F1',
                borderColor: '#7500F1',
                backgroundColor: 'white',
                fontSize: '0.8rem',
                letterSpacing: '-0.01em',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Prompt Section */}
        <h2 className="text-[1.35rem] font-bold text-black mb-3">
          Prompt
        </h2>
        <div
          className="mb-4 rounded-lg"
          style={{
            backgroundColor: '#FAFAFA',
            padding: '1.25rem 1.5rem',
            border: '1px solid #E5E7EB',
          }}
        >
          <pre
            className="text-sm text-black whitespace-pre-wrap leading-relaxed"
            style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px' }}
          >
            {prompt.fullPrompt}
          </pre>
        </div>

        {/* Copy to LLM buttons */}
        <div className="flex items-center gap-2 flex-wrap mb-10">
          {prompt.llmTools.map((tool) => (
            <button
              key={tool}
              onClick={() => handleOpenTool(tool)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer border border-gray-200 bg-white text-black hover:bg-gray-50"
            >
              <span>{LLM_ICONS[tool] ?? '\uD83D\uDCCB'}</span>
              Copy to {tool}
            </button>
          ))}
        </div>

        {/* Output Section */}
        <h2 className="text-[1.35rem] font-bold text-black mb-3">
          Output
        </h2>
        <p className="text-gray-600 text-[0.95rem] leading-relaxed">
          {prompt.description}
        </p>
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:sticky lg:top-6 flex flex-col gap-6">
        {/* Auth CTA / User Info */}
        {authLoaded && !user && (
          <div className="border border-gray-200 rounded-xl p-6">
            <p className="text-sm text-gray-600 mb-5 leading-snug text-center">
              Sign in to save the prompt and<br />auto-populate with your information
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleOAuthSignIn('google')}
                disabled={oauthLoading}
                className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-md px-3 py-2.5 text-[0.9rem] tracking-[-0.02em] hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(103,103,103,0.25)] cursor-pointer"
              >
                <span className="truncate">Continue with Google</span>
                <img
                  src="https://auth.ignite.education/storage/v1/object/public/assets/Screenshot%202026-01-10%20at%2013.00.44.png"
                  alt="Google"
                  className="w-5 h-5 flex-shrink-0 object-contain"
                />
              </button>
              <button
                type="button"
                onClick={() => handleOAuthSignIn('linkedin_oidc')}
                disabled={oauthLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#0a66c2] text-white rounded-md px-3 py-2.5 text-[0.9rem] tracking-[-0.02em] hover:bg-[#084d93] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(103,103,103,0.25)] cursor-pointer"
              >
                <span className="truncate">Continue with LinkedIn</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="flex-shrink-0">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {authLoaded && user && (
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={firstName || 'User'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: '#8200EA' }}
                >
                  {(firstName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black truncate">
                  {firstName || 'Welcome'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveToggle}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: saved ? '#009600' : '#8200EA',
                color: 'white',
              }}
              onMouseEnter={(e) => {
                if (!saved && !saving) e.currentTarget.style.backgroundColor = '#7000CC'
              }}
              onMouseLeave={(e) => {
                if (!saved && !saving) e.currentTarget.style.backgroundColor = '#8200EA'
              }}
            >
              {saved ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Saved
                </>
              ) : saving ? (
                'Saving...'
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Prompt
                </>
              )}
            </button>
          </div>
        )}

        {/* Placeholder while auth loads to prevent layout shift */}
        {!authLoaded && (
          <div className="border border-gray-200 rounded-xl p-6" style={{ minHeight: '160px' }} />
        )}

        {/* Social Sharing */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: linkCopied ? '#10B981' : '#f3f4f6',
              color: linkCopied ? 'white' : '#374151',
            }}
          >
            {linkCopied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
            <span>{linkCopied ? 'Copied!' : 'Copy link'}</span>
          </button>

          {/* LinkedIn */}
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0A66C2] hover:bg-[#004182] transition-colors"
            title="Share on LinkedIn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>

          {/* X (Twitter) */}
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(prompt.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-black hover:bg-gray-800 transition-colors"
            title="Share on X"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>

          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1877F2] hover:bg-[#0d65d9] transition-colors"
            title="Share on Facebook"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
