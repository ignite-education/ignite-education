'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { LLM_TOOLS, COMPLEXITIES, promptToSlug } from '@/data/placeholderPrompts'

interface PromptContributeModalProps {
  professions: string[]
  initialTitle?: string
  user?: User | null
  onClose: () => void
}

function extractFullName(user: { user_metadata?: Record<string, string>; email?: string }) {
  const meta = user.user_metadata ?? {}
  return meta.full_name
    || [meta.first_name, meta.last_name].filter(Boolean).join(' ')
    || meta.name
    || user.email?.split('@')[0]
    || ''
}

function extractFirstName(user: { user_metadata?: Record<string, string>; email?: string }) {
  const meta = user.user_metadata ?? {}
  return meta.full_name?.split(' ')[0]
    || meta.name?.split(' ')[0]
    || user.email?.split('@')[0]
    || 'there'
}

function extractAvatar(user: { user_metadata?: Record<string, string> }) {
  const meta = user.user_metadata ?? {}
  return meta.custom_avatar_url || meta.avatar_url || meta.picture || ''
}

const FONT = { fontFamily: 'var(--font-geist-sans), sans-serif' }

const LLM_LOGO_PATHS: Record<string, string> = {
  'Claude': 'https://auth.ignite.education/storage/v1/object/public/assets/Claude_AI_symbol.svg.png',
  'ChatGPT': 'https://auth.ignite.education/storage/v1/object/public/assets/1024px-ChatGPT-Logo%20(1).png',
  'Co-Pilot': 'https://auth.ignite.education/storage/v1/object/public/assets/copilot-color.png',
  'Gemini': 'https://auth.ignite.education/storage/v1/object/public/assets/Google_Gemini_icon_2025.svg',
}

const FIELD_TOOLTIPS: Record<string, string> = {
  Title: 'A short, descriptive name for your prompt.',
  Description: 'A brief summary of what this prompt helps with.',
  Prompt: 'The full prompt text that users will copy and use.',
  Profession: 'The profession this prompt is most relevant to.',
  'AI Tool': 'Which AI tools this prompt works best with.',
  Complexity: 'How complex or advanced this prompt is to use.',
}

function ComplexityIcon({ level }: { level: 'Low' | 'Mid' | 'High' }) {
  const bars = level === 'Low' ? 1 : level === 'Mid' ? 2 : 3
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="9" width="3" height="4" rx="0.5" fill={bars >= 1 ? '#EF0B72' : '#D1D5DB'} />
      <rect x="5.5" y="5.5" width="3" height="7.5" rx="0.5" fill={bars >= 2 ? '#EF0B72' : '#D1D5DB'} />
      <rect x="10" y="1" width="3" height="12" rx="0.5" fill={bars >= 3 ? '#EF0B72' : '#D1D5DB'} />
    </svg>
  )
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group/tip inline-flex items-center ml-[6px]">
      <span
        className="inline-flex items-center justify-center"
        style={{ width: '16px', height: '16px', borderRadius: '3px', backgroundColor: '#D4D4D4' }}
      >
        <svg
          width="12"
          height="12"
          viewBox="4 2 16 20"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </span>
      <span
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2.5 text-xs text-black bg-white rounded-md opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50"
        style={{ ...FONT, width: '140px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        {text}
      </span>
    </span>
  )
}

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export default function PromptContributeModal({ professions, initialTitle, user: preloadedUser, onClose }: PromptContributeModalProps) {
  const [closing, setClosing] = useState(false)
  const [phase, setPhase] = useState<'form' | 'thank-you'>('form')
  const [userName, setUserName] = useState(() => preloadedUser ? extractFirstName(preloadedUser) : '')
  const [userId, setUserId] = useState(() => preloadedUser?.id ?? '')
  const [authLoaded, setAuthLoaded] = useState(() => preloadedUser !== undefined)
  const [signingIn, setSigningIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittingStep, setSubmittingStep] = useState(0)
  const submittingStepRef = useRef(0)
  const SUBMIT_MESSAGES = ['Building', 'Doing the work', 'Compounding']

  // Form fields
  const [title, setTitle] = useState(initialTitle ? toTitleCase(initialTitle.trim()) : '')
  const [description, setDescription] = useState('')
  const [fullPrompt, setFullPrompt] = useState('')
  const [profession, setProfession] = useState('')
  const [professionOpen, setProfessionOpen] = useState(false)
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set())
  const [llmTools, setLlmTools] = useState<string[]>([])
  const [complexity, setComplexity] = useState<'Low' | 'Mid' | 'High' | ''>('')

  // Author fields (right column)
  const [authorName, setAuthorName] = useState(() => preloadedUser ? extractFullName(preloadedUser) : '')
  const [authorJobTitle, setAuthorJobTitle] = useState('')
  const [authorLinkedin, setAuthorLinkedin] = useState('')
  const [authorImage, setAuthorImage] = useState(() => preloadedUser ? extractAvatar(preloadedUser) : '')

  const promptRef = useRef<HTMLDivElement>(null)
  const linkedinRef = useRef<HTMLInputElement>(null)

  const isSignedIn = userId !== ''
  const isFormValid = title.trim() && description.trim() && fullPrompt.trim() && profession.trim() && llmTools.length > 0 && complexity
  const isAuthorValid = authorName.trim() !== '' && authorJobTitle.trim() !== ''
  const canSubmit = isFormValid && isAuthorValid && !submitting

  // Silently check if already signed in (skip if parent pre-loaded user)
  useEffect(() => {
    if (preloadedUser !== undefined) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        setUserName(extractFirstName(user))
        setAuthorName(extractFullName(user))
        setAuthorImage(extractAvatar(user))
      }
      setAuthLoaded(true)
    })
  }, [])

  const populateAuthorFromUser = useCallback((user: { id: string; user_metadata?: Record<string, string>; email?: string }) => {
    setAuthorName(prev => prev || extractFullName(user))
    setAuthorImage(prev => prev || extractAvatar(user))
  }, [])

  const submitToDatabase = useCallback(async (uid: string, name: string) => {
    setSubmitting(true)
    setSubmittingStep(0)
    submittingStepRef.current = 0

    // Cycle through messages every 2.5s
    const stepInterval = setInterval(() => {
      submittingStepRef.current += 1
      if (submittingStepRef.current < 3) {
        setSubmittingStep(submittingStepRef.current)
      }
    }, 2500)

    const supabase = createClient()
    let slug = promptToSlug(title.trim())

    // Ensure slug is unique — append a number suffix if it already exists
    const { count } = await supabase.from('prompts').select('id', { count: 'exact', head: true }).eq('slug', slug)
    if (count && count > 0) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Insert contribution for admin review
    const { error } = await supabase.from('prompt_contributions').insert({
      user_id: uid,
      title: title.trim(),
      description: description.trim(),
      full_prompt: fullPrompt.trim(),
      profession: profession.trim(),
      llm_tools: llmTools,
      complexity,
      author_name: authorName.trim() || null,
      author_image: authorImage || null,
      author_title: authorJobTitle.trim() || null,
      author_linkedin: authorLinkedin.trim() ? `https://linkedin.com/in/${authorLinkedin.trim()}` : null,
    })

    if (error) {
      console.error('[PromptContribute] Insert failed:', error.message, error.code)
      clearInterval(stepInterval)
      setSubmitting(false)
      return
    }

    // Save job title and LinkedIn on the user record for future use
    if (authorJobTitle.trim() || authorLinkedin.trim()) {
      const profileUpdate: Record<string, string> = {}
      if (authorJobTitle.trim()) profileUpdate.job_title = authorJobTitle.trim()
      if (authorLinkedin.trim()) profileUpdate.linkedin_url = `https://linkedin.com/in/${authorLinkedin.trim()}`
      await supabase.from('users').update(profileUpdate).eq('id', uid)
    }

    // Also create the prompt page (draft until admin approves)
    const { error: promptError } = await supabase.from('prompts').insert({
      title: title.trim(),
      slug,
      description: description.trim(),
      full_prompt: fullPrompt.trim(),
      profession: profession.trim(),
      llm_tools: llmTools,
      complexity,
      status: 'draft',
      usage_count: 0,
      rating: 0,
      author_name: authorName.trim() || null,
      author_image: authorImage || null,
      author_title: authorJobTitle.trim() || null,
      author_linkedin: authorLinkedin.trim() ? `https://linkedin.com/in/${authorLinkedin.trim()}` : null,
    })

    clearInterval(stepInterval)

    if (promptError) {
      console.error('[PromptContribute] Prompt insert failed:', promptError.message, promptError.code)
    }

    const openSlug = promptError ? null : slug
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (openSlug) {
      window.open(`/prompts/${openSlug}`, '_blank')
    }

    setSubmitting(false)
    setClosing(true)
    setTimeout(onClose, 300)
  }, [title, description, fullPrompt, profession, llmTools, complexity, authorName, authorImage, authorJobTitle, authorLinkedin, onClose])

  const handleFormSubmit = async () => {
    if (submitting) return
    const missing = new Set<string>()
    if (!title.trim()) missing.add('title')
    if (!description.trim()) missing.add('description')
    if (!fullPrompt.trim()) missing.add('prompt')
    if (!profession.trim()) missing.add('profession')
    if (llmTools.length === 0) missing.add('llmTools')
    if (!complexity) missing.add('complexity')
    if (isSignedIn && !authorName.trim()) missing.add('authorName')
    if (missing.size > 0) {
      setInvalidFields(missing)
      setTimeout(() => setInvalidFields(new Set()), 1300)
      return
    }
    setInvalidFields(new Set())
    if (!userId) return
    await submitToDatabase(userId, userName)
  }

  const startSigningIn = useCallback(() => {
    setSigningIn(true)
  }, [])

  const onAuthSuccess = useCallback(async (user: { id: string; user_metadata?: Record<string, string>; email?: string }) => {
    setUserId(user.id)
    setUserName(extractFirstName(user))
    populateAuthorFromUser(user)
    setSigningIn(false)
  }, [populateAuthorFromUser])

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
        onAuthSuccess(user)
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

      onAuthSuccess(data.user)
    } catch (err) {
      console.error('[PromptContribute] Unexpected error:', err)
      setSigningIn(false)
    }
  }, [onAuthSuccess])

  const handleLinkedInClick = useCallback(async () => {
    startSigningIn()
    openOAuthPopup('linkedin_oidc')
  }, [openOAuthPopup])

  const handleGoogleClick = useCallback(() => {
    startSigningIn()
    openOAuthPopup('google')
  }, [openOAuthPopup])

  const toggleLlmTool = (tool: string) => {
    setLlmTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool])
  }

  const htmlToMarkdown = (html: string): string => {
    let md = html
    // Convert variable spans to [text] before stripping tags
    md = md.replace(/<span[^>]*data-variable="true"[^>]*>([\s\S]*?)<\/span>/gi, (_, inner) => {
      // Strip any tags inside the variable span to get plain text
      const plain = inner.replace(/<[^>]*>/g, '')
      return `[${plain}]`
    })
    md = md.replace(/<(strong|b)\b[^>]*>/gi, '**')
    md = md.replace(/<\/(strong|b)>/gi, '**')
    md = md.replace(/<div><br\s*\/?><\/div>/gi, '\n')
    md = md.replace(/<\/div><div>/gi, '\n')
    md = md.replace(/<div>/gi, '\n')
    md = md.replace(/<\/div>/gi, '')
    md = md.replace(/<br\s*\/?>/gi, '\n')
    md = md.replace(/<[^>]*>/g, '')
    md = md.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    if (md.startsWith('\n')) md = md.slice(1)
    return md
  }

  const syncPromptContent = () => {
    if (promptRef.current) {
      setFullPrompt(htmlToMarkdown(promptRef.current.innerHTML))
    }
  }

  const toggleBold = () => {
    const el = promptRef.current
    if (!el) return
    el.focus()
    document.execCommand('bold', false)
    syncPromptContent()
  }

  const VAR_STYLE = 'background:#fff;border-radius:4px;padding:1px 6px;display:inline'

  const toggleVariable = () => {
    const el = promptRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)

    // Check if cursor/selection is inside an existing variable span
    const parentVar = (range.startContainer as HTMLElement).closest?.('[data-variable]')
      || (range.startContainer.parentElement?.closest?.('[data-variable]'))
    if (parentVar) {
      // Unwrap: replace span with its text content
      const text = document.createTextNode(parentVar.textContent || '')
      parentVar.parentNode?.replaceChild(text, parentVar)
      const newRange = document.createRange()
      newRange.selectNodeContents(text)
      sel.removeAllRanges()
      sel.addRange(newRange)
      syncPromptContent()
      return
    }

    const span = document.createElement('span')
    span.setAttribute('data-variable', 'true')
    span.style.cssText = VAR_STYLE

    if (range.collapsed) {
      span.textContent = '\u00A0'
      range.insertNode(span)
      const innerRange = document.createRange()
      innerRange.setStart(span.firstChild!, 0)
      innerRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(innerRange)
    } else {
      span.textContent = range.toString()
      range.deleteContents()
      range.insertNode(span)
      const newRange = document.createRange()
      newRange.selectNodeContents(span)
      sel.removeAllRanges()
      sel.addRange(newRange)
    }
    // Ensure a zero-width space exists after the variable span so the cursor can land outside it
    if (!span.nextSibling || (span.nextSibling.nodeType === Node.TEXT_NODE && span.nextSibling.textContent === '')) {
      span.parentNode?.insertBefore(document.createTextNode('\u200B'), span.nextSibling)
    }
    syncPromptContent()
  }

  const escapeVariableSpan = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return false
    const range = sel.getRangeAt(0)
    if (!range.collapsed) return false
    const node = range.startContainer
    const varSpan = node.nodeType === Node.TEXT_NODE
      ? node.parentElement?.closest('[data-variable]')
      : (node as HTMLElement).closest?.('[data-variable]')
    if (!varSpan) return false
    // Check if cursor is at the end of the variable content
    const atEnd = range.startOffset >= (node.textContent?.length ?? 0)
    if (!atEnd) return false
    let after = varSpan.nextSibling
    if (!after || after.nodeType !== Node.TEXT_NODE) {
      after = document.createTextNode('\u200B')
      varSpan.parentNode?.insertBefore(after, varSpan.nextSibling)
    }
    const newRange = document.createRange()
    newRange.setStart(after, after.nodeType === Node.TEXT_NODE ? Math.min(1, after.textContent?.length ?? 0) : 0)
    newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)
    return true
  }, [])

  const handlePromptKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      if (escapeVariableSpan()) e.preventDefault()
    }
  }, [escapeVariableSpan])

  const handlePromptClick = useCallback((e: React.MouseEvent) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (!range.collapsed) return
    const node = range.startContainer
    const varSpan = node.nodeType === Node.TEXT_NODE
      ? node.parentElement?.closest('[data-variable]')
      : (node as HTMLElement).closest?.('[data-variable]')
    if (!varSpan) return
    const rect = (varSpan as HTMLElement).getBoundingClientRect()
    if (e.clientX > rect.right - 2) {
      escapeVariableSpan()
    }
  }, [escapeVariableSpan])

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Google icon SVG
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )

  const LinkedInIcon = ({ size = 20, color = '#0077B5' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )

  // Shared label width for inline layout
  // LABEL_WIDTH removed — labels shrink-wrap; gap handles spacing
  const INPUT_CLASS = 'flex-1 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none transition-colors'
  const FIELD_BG = '#F6F6F6'
  const errorOutline = (field: string): Record<string, string> => ({
    outline: '0.5px solid',
    outlineColor: invalidFields.has(field) ? '#EF0B72' : 'transparent',
    transition: 'outline-color 0.6s ease',
  })
  const clearError = (field: string) => { if (invalidFields.has(field)) setInvalidFields(prev => { const next = new Set(prev); next.delete(field); return next }) }

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
        className={`relative bg-white ${closing ? 'animate-scaleDown' : 'animate-scaleUp'}`}
        style={{
          width: phase === 'thank-you' ? '540px' : '975px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {phase === 'form' ? (
          <div className="flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header — spans full width */}
            <div style={{ padding: '2rem 2.25rem 0 2.25rem' }}>
              <h3
                className="text-[1.6rem] font-bold text-black leading-tight tracking-[-0.02em]"
                style={FONT}
              >
                Submit a Prompt
              </h3>
              <p
                className="text-black font-light mt-1 leading-snug"
                style={{ ...FONT, fontSize: '1rem', letterSpacing: '-0.01em' }}
              >
                Share your best AI prompt to tackle work tasks more effectively and get better results, faster.
              </p>
            </div>

            <div className="flex flex-col md:flex-row flex-1">
            {/* LEFT COLUMN — Form */}
            <div style={{ flex: '0.95', padding: '1rem 2.25rem 2rem 2.25rem' }}>
              <div className="flex flex-col" style={{ gap: '14px' }}>
                {/* Title */}
                <div className="flex items-center gap-[5px]">
                  <div className="flex items-center shrink-0" style={{ minWidth: '130px' }}>
                    <label className="font-semibold text-black tracking-[-0.01em]" style={{ ...FONT, fontSize: '1.1rem' }}>
                      Title
                    </label>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); clearError('title') }}
                    placeholder=""
                    className={INPUT_CLASS}
                    style={{ ...FONT, backgroundColor: FIELD_BG, ...errorOutline('title') }}
                  />
                </div>

                {/* Description */}
                <div className="flex items-center gap-[5px]">
                  <div className="flex items-center shrink-0" style={{ minWidth: '130px' }}>
                    <label className="font-semibold text-black tracking-[-0.01em]" style={{ ...FONT, fontSize: '1.1rem' }}>
                      Description
                    </label>
                    <InfoTooltip text={FIELD_TOOLTIPS.Description} />
                  </div>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); clearError('description') }}
                    placeholder=""
                    className={INPUT_CLASS}
                    style={{ ...FONT, backgroundColor: FIELD_BG, ...errorOutline('description') }}
                  />
                </div>

                {/* Prompt */}
                <div className="flex items-start gap-[5px]">
                  <div className="flex items-center shrink-0 pt-2" style={{ minWidth: '130px' }}>
                    <label className="font-semibold text-black tracking-[-0.01em]" style={{ ...FONT, fontSize: '1.1rem' }}>
                      Prompt
                    </label>
                    <InfoTooltip text={FIELD_TOOLTIPS.Prompt} />
                  </div>
                  <div className="flex-1">
                    <div
                      ref={promptRef}
                      contentEditable
                      onInput={() => { syncPromptContent(); clearError('prompt') }}
                      onKeyDown={handlePromptKeyDown}
                      onClick={handlePromptClick}
                      onPaste={(e) => {
                        e.preventDefault()
                        const text = e.clipboardData.getData('text/plain')
                        document.execCommand('insertText', false, text)
                      }}
                      className="w-full rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none transition-colors"
                      style={{ ...FONT, backgroundColor: FIELD_BG, minHeight: '136px', whiteSpace: 'pre-wrap', overflowY: 'auto', ...errorOutline('prompt') }}
                    />
                    <div className="flex justify-end gap-1.5" style={{ marginTop: '5px' }}>
                      <button
                        type="button"
                        onClick={toggleBold}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-black hover:text-[#EF0B72] transition-colors"
                        style={FONT}
                        title="Bold selected text (Ctrl+B)"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>
                        Bold
                      </button>
                      <button
                        type="button"
                        onClick={toggleVariable}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-black hover:text-[#EF0B72] transition-colors"
                        style={FONT}
                        title="Wrap selection as variable [text]"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3"/><path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3"/></svg>
                        Variable
                      </button>
                    </div>
                  </div>
                </div>

                {/* Profession */}
                <div className="flex items-center gap-[5px]">
                  <div className="flex items-center shrink-0" style={{ minWidth: '130px' }}>
                    <label className="font-semibold text-black tracking-[-0.01em]" style={{ ...FONT, fontSize: '1.1rem' }}>
                      Profession
                    </label>
                  </div>
                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={() => { setProfessionOpen(prev => !prev); clearError('profession') }}
                      onBlur={() => setTimeout(() => setProfessionOpen(false), 150)}
                      className="w-full rounded-lg px-3 py-2 text-sm text-left focus:outline-none transition-colors flex items-center justify-between cursor-pointer"
                      style={{ ...FONT, backgroundColor: FIELD_BG, color: profession ? '#111827' : '#9CA3AF', ...errorOutline('profession') }}
                    >
                      <span>{profession || '\u00A0'}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: professionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {(() => {
                      return (
                        <div
                          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg overflow-y-auto z-30"
                          style={{
                            maxHeight: '102px',
                            scrollbarWidth: 'none',
                            overscrollBehavior: 'contain',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            opacity: professionOpen ? 1 : 0,
                            transform: professionOpen ? 'scaleY(1)' : 'scaleY(0.95)',
                            transformOrigin: 'top',
                            pointerEvents: professionOpen ? 'auto' : 'none',
                            transition: 'opacity 0.15s ease, transform 0.15s ease',
                          }}
                        >
                          {professions.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setProfession(p); setProfessionOpen(false); clearError('profession') }}
                              className={`w-full text-left px-3 py-1.5 text-sm text-gray-900 hover:!bg-[#F6F6F6] cursor-pointer transition-colors ${profession === p ? 'bg-[#F6F6F6] font-medium' : ''}`}
                              style={FONT}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* AI Tool */}
                <div className="flex items-center gap-[5px]">
                  <div className="flex items-center shrink-0" style={{ minWidth: '130px' }}>
                    <label className="font-semibold text-black tracking-[-0.01em]" style={{ ...FONT, fontSize: '1.1rem' }}>
                      AI Tool
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2 rounded-lg" style={{ ...errorOutline('llmTools'), outlineOffset: '4px', borderRadius: '8px' }}>
                    {LLM_TOOLS.map((tool) => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => { toggleLlmTool(tool); clearError('llmTools') }}
                        className="px-4 py-1.5 rounded-lg font-normal transition-colors cursor-pointer flex items-center gap-1.5 text-black hover:!bg-[#E2E2E2]"
                        style={{ ...FONT, fontSize: '0.75rem', letterSpacing: '-0.02em', backgroundColor: llmTools.includes(tool) ? '#E2E2E2' : FIELD_BG }}
                      >
                        {tool}
                        {LLM_LOGO_PATHS[tool] && (
                          <img
                            src={LLM_LOGO_PATHS[tool]}
                            alt=""
                            width={16}
                            height={16}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Complexity */}
                <div className="flex items-center gap-[5px] pb-2">
                  <div className="flex items-center shrink-0" style={{ minWidth: '130px' }}>
                    <label className="font-semibold text-black tracking-[-0.01em]" style={{ ...FONT, fontSize: '1.1rem' }}>
                      Complexity
                    </label>
                  </div>
                  <div className="flex gap-2 rounded-lg" style={{ ...errorOutline('complexity'), outlineOffset: '4px', borderRadius: '8px' }}>
                    {COMPLEXITIES.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => { setComplexity(level); clearError('complexity') }}
                        className="px-5 py-1.5 rounded-lg font-normal transition-colors cursor-pointer text-black flex items-center gap-1.5 hover:!bg-[#E2E2E2]"
                        style={{ ...FONT, fontSize: '0.75rem', letterSpacing: '-0.02em', backgroundColor: complexity === level ? '#E2E2E2' : FIELD_BG }}
                      >
                        <ComplexityIcon level={level as 'Low' | 'Mid' | 'High'} />
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — Auth / Profile */}
            <div
              className="flex flex-col items-center justify-center"
              style={{ width: '330px', minWidth: '330px', padding: '2rem 1.75rem', opacity: authLoaded ? 1 : 0, transition: 'opacity 0.15s ease' }}
            >
              {signingIn ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              ) : isSignedIn ? (
                /* Signed-in: Profile card */
                <div className="flex flex-col items-start w-full max-w-[260px]" style={{ gap: '16px' }}>
                  {/* Avatar */}
                  {authorImage ? (
                    <img
                      src={authorImage}
                      alt=""
                      className="object-cover"
                      style={{ width: '70px', height: '70px', borderRadius: '4px' }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="bg-gray-200 text-gray-600 flex items-center justify-center text-xl font-semibold"
                      style={{ width: '70px', height: '70px', borderRadius: '4px' }}
                    >
                      {authorName.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}

                  <p className="text-black font-light leading-snug" style={{ ...FONT, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                    Your public info for the prompt.
                  </p>

                  {/* Author fields */}
                  <div className="w-full space-y-3">
                    {/* Name */}
                    <div className="flex items-center gap-3">
                      <label className="font-semibold text-black tracking-[-0.01em] whitespace-nowrap" style={{ ...FONT, fontSize: '1.1rem', width: '52px' }}>
                        Name
                      </label>
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => { setAuthorName(e.target.value); clearError('authorName') }}
                        className="flex-1 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none transition-colors"
                        style={{ ...FONT, backgroundColor: FIELD_BG, ...errorOutline('authorName') }}
                      />
                    </div>

                    {/* Title */}
                    <div className="flex items-center gap-3">
                      <label className="font-semibold text-black tracking-[-0.01em] whitespace-nowrap" style={{ ...FONT, fontSize: '1.1rem', width: '52px' }}>
                        Title
                      </label>
                      <input
                        type="text"
                        value={authorJobTitle}
                        onChange={(e) => setAuthorJobTitle(e.target.value)}
                        className="flex-1 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none transition-colors"
                        style={{ ...FONT, backgroundColor: FIELD_BG }}
                      />
                    </div>

                    {/* LinkedIn */}
                    <div className="flex items-center gap-3">
                      <div style={{ width: '52px', flexShrink: 0 }} className="flex items-center">
                        <img src="https://auth.ignite.education/storage/v1/object/public/assets/LinkedIn_logo_initials.png" alt="" width={20} height={20} />
                      </div>
                      <div
                        className="flex-1 min-w-0 flex items-center rounded-lg py-1.5 text-sm text-gray-900 cursor-text"
                        style={{ backgroundColor: FIELD_BG }}
                        onClick={() => linkedinRef.current?.focus()}
                      >
                        <span className="pl-3 select-none text-gray-400 whitespace-nowrap" style={FONT}>linkedin.com/in/</span>
                        <input
                          ref={linkedinRef}
                          type="text"
                          value={authorLinkedin}
                          onChange={(e) => setAuthorLinkedin(e.target.value)}
                          className="flex-1 min-w-0 bg-transparent pr-3 text-sm text-gray-900 focus:outline-none"
                          style={FONT}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={submitting}
                    className="w-full py-2.5 font-semibold cursor-pointer mt-1 shadow-none hover:shadow-[0_0_12px_rgba(60,60,60,0.36)]"
                    style={{
                      ...FONT,
                      fontSize: '0.9rem',
                      borderRadius: '4px',
                      backgroundColor: '#EF0B72',
                      color: 'white',
                      transition: 'box-shadow 0.3s ease',
                    }}
                  >
                    {submitting ? (
                      <span className="inline-flex items-center" key={submittingStep}>
                        {(SUBMIT_MESSAGES[submittingStep] + '...').split('').map((char, i) => (
                          <span
                            key={i}
                            style={{
                              animation: 'letterFadeIn 0.4s ease forwards',
                              animationDelay: `${i * 0.03}s`,
                              opacity: 0,
                            }}
                          >{char}</span>
                        ))}
                      </span>
                    ) : 'Submit'}
                  </button>
                </div>
              ) : (
                /* Signed-out: Auth buttons */
                <div className="flex flex-col items-center w-full" style={{ gap: '12px' }}>
                  <p className="text-sm text-gray-700 text-center mb-2" style={FONT}>
                    Sign in to save your prompt
                  </p>

                  <button
                    onClick={handleGoogleClick}
                    className="w-full flex items-center bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition cursor-pointer overflow-hidden"
                    style={{ height: '44px' }}
                  >
                    <span className="flex-1 text-center text-[14px] font-medium text-gray-700" style={FONT}>
                      Continue with Google
                    </span>
                    <div className="flex items-center justify-center" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                      <GoogleIcon />
                    </div>
                  </button>

                  <button
                    onClick={handleLinkedInClick}
                    className="w-full flex items-center bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition cursor-pointer overflow-hidden"
                    style={{ height: '44px' }}
                  >
                    <span className="flex-1 text-center text-[14px] font-medium text-gray-700" style={FONT}>
                      Continue with LinkedIn
                    </span>
                    <div className="flex items-center justify-center" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                      <LinkedInIcon size={20} />
                    </div>
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        ) : (
          /* Thank-you phase */
          <div className="flex flex-col items-center justify-center animate-fadeIn" style={{ height: '350px', padding: '2rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-4">
              <circle cx="12" cy="12" r="11" stroke="#009600" strokeWidth="2" />
              <path d="M7 12.5l3 3 7-7" stroke="#009600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p
              className="text-[#009600] text-center text-[1rem] font-semibold tracking-[-0.02em] leading-tight"
              style={FONT}
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
