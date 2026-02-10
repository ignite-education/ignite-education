'use client'

import { useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import useTypingAnimation from '@/hooks/useTypingAnimation'
import { extractTextFromHtml, splitIntoWords } from '@/lib/textNormalization'
import type { BlogPost, BlogPostAudio } from '@/types/blog'
import BlogNarration from './BlogNarration'
import ShareButtons from './ShareButtons'

interface BlogPostClientProps {
  post: BlogPost
  audioData: BlogPostAudio | null
}

/**
 * Extract a YouTube video ID from a URL.
 */
function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

export default function BlogPostClient({ post, audioData }: BlogPostClientProps) {
  const [isReading, setIsReading] = useState(false)
  const articleRef = useRef<HTMLElement>(null)
  const contentContainerRef = useRef<HTMLDivElement>(null)

  const { displayText: typedTitle, isComplete: isTypingComplete } = useTypingAnimation(
    post.title,
    { charDelay: 75, startDelay: 1000, enabled: true }
  )

  // Parse content into words for narration (must match backend word counting)
  const contentWords = useMemo(() => {
    if (!post.content) return []
    const plainText = extractTextFromHtml(post.content)
    return splitIntoWords(plainText)
  }, [post.content])

  // Process HTML with word spans when narration is active
  const processedContentHtml = useMemo(() => {
    if (!post.content || !isReading) return null

    const div = document.createElement('div')
    div.innerHTML = post.content

    let wordCounter = 0

    const processNode = (node: Node, insideH2 = false): Node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        const normalizedText = text.replace(/\s+/g, ' ')
        const words = normalizedText.split(' ')
        const span = document.createElement('span')

        words.forEach((word, idx) => {
          if (word.length > 0) {
            const wordSpan = document.createElement('span')
            wordSpan.textContent = word
            wordSpan.setAttribute('data-word-index', wordCounter.toString())
            if (insideH2) {
              wordSpan.setAttribute('data-skip-highlight', 'true')
            }
            wordCounter++
            span.appendChild(wordSpan)
            if (idx < words.length - 1) {
              span.appendChild(document.createTextNode(' '))
            }
          } else if (idx === 0 && normalizedText.startsWith(' ')) {
            span.appendChild(document.createTextNode(' '))
          }
        })

        return span
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const clone = el.cloneNode(false)
        const tagName = el.tagName?.toLowerCase()
        const isH2 = tagName === 'h2'
        Array.from(node.childNodes).forEach((child) => {
          clone.appendChild(processNode(child, insideH2 || isH2))
        })
        return clone
      }
      return node.cloneNode(true)
    }

    const processedDiv = document.createElement('div')
    Array.from(div.childNodes).forEach((child) => {
      processedDiv.appendChild(processNode(child))
    })

    return processedDiv.innerHTML
  }, [post.content, isReading])

  const videoId = post.featured_video ? getYouTubeVideoId(post.featured_video) : null

  return (
    <>
      {/* Hero Section with Black Background */}
      <div className="bg-black">
        <div className="max-w-4xl mx-auto px-6 py-12 flex justify-center">
          <div className="w-full" style={{ maxWidth: '762px' }}>
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-sm mb-7" style={{ color: '#F0F0F2' }}>
              <Link href="/" className="hover:text-[#EF0B72] transition-colors flex items-center" style={{ color: '#F0F0F2' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
              <svg className="w-4 h-4" style={{ color: '#F0F0F2' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span style={{ color: '#F0F0F2' }}>Posts</span>
              <svg className="w-4 h-4" style={{ color: '#F0F0F2' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="truncate max-w-md" style={{ color: '#F0F0F2' }}>{post.title}</span>
            </nav>

            {/* Title with typing animation */}
            <div className="relative">
              <h1 className="text-5xl font-bold text-white mb-3.5 leading-tight text-left invisible" aria-hidden="true">
                {post.title}
              </h1>
              <h1 className="text-5xl font-bold text-white mb-3.5 leading-tight text-left absolute top-0 left-0 right-0">
                {typedTitle}
                {!isTypingComplete && (
                  <span className="animate-blink" style={{ borderRight: '2px solid white', marginLeft: '2px' }}>&nbsp;</span>
                )}
              </h1>
            </div>

            {/* Excerpt */}
            <p className="text-xl text-[#EF0B72] mb-3.5 leading-relaxed text-left">
              {post.excerpt}
            </p>
          </div>
        </div>
      </div>

      {/* White Content Section */}
      <div>
        {/* Featured Media — positioned at black/white transition */}
        {(post.featured_image || videoId) && (
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-black" />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white" />
            <div className="relative max-w-4xl mx-auto px-6 flex justify-center">
              <div className="rounded-lg overflow-hidden w-full" style={{ maxWidth: '762px' }}>
                {videoId ? (
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={post.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : post.featured_image ? (
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-auto object-cover"
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Main White Content */}
        <div className="bg-white">
          {/* Narration Controls */}
          {audioData?.audio_url && (
            <BlogNarration
              audioUrl={audioData.audio_url}
              wordTimestamps={audioData.word_timestamps}
              durationSeconds={audioData.duration_seconds}
              contentWords={contentWords}
              articleRef={articleRef}
              contentContainerRef={contentContainerRef}
              isReading={isReading}
              onReadingChange={setIsReading}
            />
          )}

          <div className="max-w-4xl mx-auto px-6 pb-16 flex justify-center">
            <article ref={articleRef} className="blog-article w-full" style={{ maxWidth: '762px' }}>
              {/* Article Body */}
              <div
                className="prose prose-lg max-w-none"
                style={{
                  color: '#000000',
                  fontSize: '18px',
                  lineHeight: '1.8',
                  textAlign: 'left',
                }}
              >
                <style>{`
                  .prose h2 {
                    background-color: black;
                    color: white;
                    font-size: 1.4rem;
                    font-weight: 500;
                    padding: 0.35rem 0.5rem;
                    border-radius: 0.2rem;
                    max-width: 750px;
                    width: fit-content;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    text-align: left;
                  }
                  .prose h3 {
                    color: #000000;
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    text-align: left;
                  }
                  .prose p {
                    color: #000000;
                    margin-top: 0;
                    margin-bottom: 1rem;
                    text-align: left;
                  }
                  .prose ul, .prose ol {
                    margin-top: 1rem;
                    margin-bottom: 1rem;
                    padding-left: 1.5rem;
                  }
                  .prose li {
                    color: #000000;
                    margin-bottom: 0.75rem;
                  }
                  .prose strong {
                    color: #000000;
                    font-weight: 600;
                  }
                  .prose a {
                    color: #000000;
                    text-decoration: underline;
                    transition: all 0.2s;
                  }
                  .prose a:hover {
                    color: #EF0B72;
                  }
                  .prose blockquote {
                    border-left: 4px solid #EF0B72;
                    padding-left: 1.5rem;
                    font-style: italic;
                    color: #000000;
                  }
                  .prose .blog-line-break {
                    display: block;
                    height: 0.5em;
                  }
                `}</style>
                {processedContentHtml ? (
                  <div
                    ref={contentContainerRef}
                    dangerouslySetInnerHTML={{ __html: processedContentHtml }}
                  />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: post.content || '' }} />
                )}
              </div>

              {/* Share Section */}
              <ShareButtons slug={post.slug} title={post.title} />
            </article>
          </div>
        </div>
      </div>
    </>
  )
}
