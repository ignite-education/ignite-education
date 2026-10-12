import type { DescriptionBlock } from './descriptionBlocks'

/**
 * The advert as HTML, for JobPosting.description.
 *
 * Google wants the description as HTML and wants it to match what the page
 * shows. Both come from the same DescriptionBlock[] — the page renders the
 * blocks as elements, this renders them as a string — so the two cannot
 * disagree. We write every tag ourselves and escape every character of advert
 * text, which is what lets the output into a JSON-LD block without a
 * sanitiser: the only markup here is the markup below.
 *
 * Consecutive bullets become one <ul>. The pane deliberately does NOT do this
 * (see its comment — guessing list boundaries from a flattened advert is
 * guessing), but for the structured-data copy a <ul> around a run of bullets
 * is the honest shape, and getting a boundary wrong costs nothing visible.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function blocksToHtml(blocks: DescriptionBlock[]): string {
  const out: string[] = []
  let list: string[] = []

  const flush = () => {
    if (list.length) {
      out.push(`<ul>${list.map(item => `<li>${item}</li>`).join('')}</ul>`)
      list = []
    }
  }

  for (const block of blocks) {
    if (block.type === 'bullet') {
      list.push(escapeHtml(block.text))
    } else {
      flush()
      out.push(`<p>${escapeHtml(block.text)}</p>`)
    }
  }
  flush()
  return out.join('')
}
