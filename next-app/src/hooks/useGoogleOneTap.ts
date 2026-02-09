'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void
          prompt: (callback?: (notification: GooglePromptNotification) => void) => void
          cancel: () => void
        }
      }
    }
  }
}

interface GooglePromptNotification {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
  isDismissedMoment: () => boolean
  getNotDisplayedReason: () => string
  getSkippedReason: () => string
  getDismissedReason: () => string
}

interface GoogleOneTapOptions {
  onSuccess?: (credential: string, nonce: string) => void
  onError?: (error: Error) => void
  enabled?: boolean
  autoPrompt?: boolean
}

interface RenderButtonOptions {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  width?: number
}

export const generateNonce = async () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const rawNonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')

  const encoder = new TextEncoder()
  const data = encoder.encode(rawNonce)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return { rawNonce, hashedNonce }
}

export default function useGoogleOneTap({
  onSuccess,
  onError,
  enabled = true,
  autoPrompt = false,
}: GoogleOneTapOptions) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const nonceRef = useRef<{ raw: string | null; hashed: string | null }>({ raw: null, hashed: null })

  useEffect(() => {
    if (!enabled) return

    const checkGIS = () => {
      if (window.google?.accounts?.id) {
        setIsLoaded(true)
        return true
      }
      return false
    }

    if (checkGIS()) return

    const interval = setInterval(() => {
      if (checkGIS()) clearInterval(interval)
    }, 100)

    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (!window.google?.accounts?.id) {
        setError(new Error('Google Identity Services failed to load'))
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [enabled])

  const initialize = useCallback(async () => {
    if (!isLoaded || !enabled || isInitialized) return

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError(new Error('Google Client ID not configured'))
      return
    }

    try {
      const { rawNonce, hashedNonce } = await generateNonce()
      nonceRef.current = { raw: rawNonce, hashed: hashedNonce }

      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) {
            onSuccess?.(response.credential, nonceRef.current.raw!)
          } else {
            const err = new Error('No credential received from Google')
            setError(err)
            onError?.(err)
          }
        },
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
        cancel_on_tap_outside: false,
        context: 'signup',
        itp_support: true,
      })

      setIsInitialized(true)

      if (autoPrompt) {
        window.google!.accounts.id.prompt()
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
    }
  }, [isLoaded, isInitialized, enabled, onSuccess, onError, autoPrompt])

  useEffect(() => {
    initialize()
  }, [initialize])

  const renderButton = useCallback((containerElement: HTMLElement | null, options: RenderButtonOptions = {}) => {
    if (!isLoaded || !isInitialized || !containerElement) return

    window.google!.accounts.id.renderButton(containerElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 280,
      ...options,
    })
  }, [isLoaded, isInitialized])

  useEffect(() => {
    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel()
      }
    }
  }, [])

  return {
    isLoaded,
    isInitialized,
    error,
    renderButton,
  }
}
