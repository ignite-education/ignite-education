/**
 * Text Normalization Utilities for Voice-Over Narration Synchronization
 *
 * These functions ensure that the text sent to ElevenLabs for TTS generation
 * matches EXACTLY the text used for word counting on the frontend.
 * This is critical for accurate highlight synchronization during audio playback.
 *
 * IMPORTANT: Any changes to these functions must be mirrored in server.js
 * to maintain backend/frontend consistency.
 */

/**
 * Normalize text for narration by removing formatting markers and collapsing whitespace.
 * Used for both markdown-style content (LearningHub) and plain text.
 *
 * @param {string} text - Raw text potentially containing formatting markers
 * @returns {string} - Normalized text with single spaces between words
 */
export function normalizeTextForNarration(text) {
  if (!text) return '';
  return text
    // Step 1: Collapse all whitespace (newlines, tabs, multiple spaces) to single space
    .replace(/\s+/g, ' ')
    // Step 2: Remove markdown bold markers (**)
    .replace(/\*\*/g, '')
    // Step 3: Remove markdown underline markers (__)
    .replace(/__/g, '')
    // Step 4: Remove markdown italic markers (single * not adjacent to other *)
    .replace(/(?<!\*)\*(?!\*)/g, '')
    // Step 5: Remove bullet markers (•, -, –, —) and any following whitespace
    .replace(/[•\-–—]\s*/g, '')
    // Step 6: Final trim
    .trim();
}

/**
 * Extract plain text from HTML content.
 *
 * CRITICAL: This function adds spaces before block-level elements to match
 * how browsers extract textContent. Without this, text from adjacent blocks
 * would be joined without spaces (e.g., "<p>Hello</p><p>World</p>" would
 * become "HelloWorld" instead of "Hello World").
 *
 * @param {string} html - HTML content
 * @returns {string} - Plain text with proper spacing
 */
export function extractTextFromHtml(html) {
  if (!html) return '';

  return html
    // Remove script and style tags entirely (including content)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove H2 headers entirely - section headers shouldn't be narrated
    // This keeps narration focused on body content
    .replace(/<h2[^>]*>[\s\S]*?<\/h2>/gi, ' ')
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
    .trim();
}

/**
 * Split normalized text into words for timestamp alignment.
 *
 * IMPORTANT: Both backend (word timestamp generation) and frontend (word counting
 * for highlight mapping) MUST use this same splitting logic.
 *
 * @param {string} text - Normalized text (output from normalizeTextForNarration or extractTextFromHtml)
 * @returns {string[]} - Array of words
 */
export function splitIntoWords(text) {
  if (!text) return [];
  return text.split(' ').filter(word => word.length > 0);
}

/**
 * Convert ElevenLabs character-level timestamps to word-level timestamps.
 *
 * ElevenLabs returns timestamps for each character. This function aggregates them
 * into word-level timestamps based on space-delimited word boundaries.
 *
 * IMPORTANT: The input text should already be normalized (single spaces only).
 *
 * @param {string} text - The normalized text that was sent to ElevenLabs
 * @param {string[]} characters - Array of characters from ElevenLabs alignment
 * @param {number[]} characterStartTimes - Start time in seconds for each character
 * @param {number[]} characterEndTimes - End time in seconds for each character
 * @returns {Array<{word: string, start: number, end: number, index: number}>}
 */
export function convertCharacterToWordTimestamps(text, characters, characterStartTimes, characterEndTimes) {
  if (!text || !characters || !characterStartTimes || !characterEndTimes) {
    return [];
  }

  const wordTimestamps = [];
  let wordIndex = 0;
  let wordStart = null;
  let wordEnd = null;
  let currentWord = '';

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    // Since text is pre-normalized, only space is a word boundary
    const isSpace = char === ' ';

    if (isSpace) {
      // End of a word - save it if we have one
      if (currentWord.length > 0 && wordStart !== null) {
        wordTimestamps.push({
          word: currentWord,
          start: wordStart,
          end: wordEnd,
          index: wordIndex
        });
        wordIndex++;
        currentWord = '';
        wordStart = null;
        wordEnd = null;
      }
    } else {
      // Part of a word
      if (wordStart === null) {
        wordStart = characterStartTimes[i];
      }
      wordEnd = characterEndTimes[i];
      currentWord += char;
    }
  }

  // Don't forget the last word if text doesn't end with space
  if (currentWord.length > 0 && wordStart !== null) {
    wordTimestamps.push({
      word: currentWord,
      start: wordStart,
      end: wordEnd,
      index: wordIndex
    });
  }

  return wordTimestamps;
}
