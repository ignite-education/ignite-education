/**
 * Text Normalization Utilities for Voice-Over Narration Synchronization
 *
 * These functions ensure that the text sent to ElevenLabs for TTS generation
 * matches EXACTLY the text used for word counting on the frontend.
 * This is critical for accurate highlight synchronization during audio playback.
 *
 * IMPORTANT: Any changes to these functions must be mirrored in server.js
 * and src/utils/textNormalization.js to maintain consistency.
 */

/**
 * Extract plain text from HTML content.
 *
 * CRITICAL: This function adds spaces before block-level elements to match
 * how browsers extract textContent. Without this, text from adjacent blocks
 * would be joined without spaces (e.g., "<p>Hello</p><p>World</p>" would
 * become "HelloWorld" instead of "Hello World").
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return ''

  return html
    // Remove script and style tags entirely (including content)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // CRITICAL: Replace blog-line-break spans with a space (they represent line breaks in text)
    // Without the space, words on either side get joined: "ever.<br>There's" -> "ever.There's"
    .replace(/<span class="blog-line-break"><\/span>/gi, ' ')
    // CRITICAL: Add space BEFORE block-level elements to match browser textContent behavior
    // This prevents words from being joined across block boundaries
    .replace(/<(p|div|br|h[1-6]|li|tr|td|th|blockquote|pre|hr)[^>]*>/gi, ' ')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    // Collapse all whitespace to single spaces and trim
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split normalized text into words for timestamp alignment.
 *
 * IMPORTANT: Both backend (word timestamp generation) and frontend (word counting
 * for highlight mapping) MUST use this same splitting logic.
 */
export function splitIntoWords(text: string): string[] {
  if (!text) return []
  return text.split(' ').filter(word => word.length > 0)
}
