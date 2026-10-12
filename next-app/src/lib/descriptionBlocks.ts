/**
 * Split an advert into renderable blocks.
 *
 * Directive-free on purpose: this is called from the detail pane (a client
 * component) AND from the per-job page (a server component), and a function
 * exported from a 'use client' module cannot be called on the server. It lived
 * in lib/jobDescription.ts until that page existed; that file re-exports it so
 * nothing that imported it there had to move.
 *
 * htmlToText (server/jobs/lib/normalise.js) has already flattened the
 * employer's markup: `<br>` and block closes became newlines, `<li>` became a
 * "• " prefix, and runs of blank lines were collapsed to at most one. So the
 * text arrives pre-structured and all this has to do is read that structure
 * back — paragraphs on newlines, and a bullet wherever the marker survived.
 *
 * The marker is not always ours. htmlToText only writes "• " for a real <li>,
 * and a great many adverts are typed into a plain-text field in the ATS with a
 * hyphen or an asterisk instead — those arrive as literal characters and no
 * list markup ever existed to convert. BULLET_MARKER therefore takes the lot.
 * The trailing \s+ is what keeps it honest: it matches "- Lead the discovery"
 * and leaves "e-commerce" and a line opening on a negative number alone.
 *
 * Rendering description_text rather than description_html is a security
 * decision as much as a formatting one. The HTML column is markup we did not
 * write, from hundreds of employers and half a dozen ATS vendors, and putting
 * it on the page would mean dangerouslySetInnerHTML and a sanitiser to
 * maintain. Plain text cannot carry a script.
 */
export interface DescriptionBlock {
  type: 'bullet' | 'paragraph'
  text: string
}

export const BULLET_MARKER = /^[•·*–—-]\s+/

export function parseDescription(text: string): DescriptionBlock[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line =>
      BULLET_MARKER.test(line)
        ? { type: 'bullet' as const, text: line.replace(BULLET_MARKER, '') }
        : { type: 'paragraph' as const, text: line }
    )
    .filter(block => block.text.length > 0)
}
