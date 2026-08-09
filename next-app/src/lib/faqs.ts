/**
 * The site-level "what is this?" FAQs.
 *
 * Rendered on /welcome and on /jobs, which is why they live here rather than
 * inside either page. They answer the question a cold visitor arrives with —
 * a lot of /jobs traffic lands from a search for a vacancy and has never heard
 * of Ignite — so the set is deliberately about the product, not about the page
 * it happens to be on.
 *
 * Only /welcome emits FAQPage structured data for these. Publishing the same
 * mainEntity from two URLs asks Google to pick a canonical between them for no
 * gain, so /jobs renders the same copy as plain markup. If /jobs ever gets its
 * own board-specific questions, that is the point at which it earns its own
 * FAQPage block.
 */
export interface FAQ {
  question: string
  answer: string
}

export const SITE_FAQS: FAQ[] = [
  {
    question: 'What is Ignite?',
    answer: 'Ignite gives you free, expert-built courses in high-demand careers so you can build the skills that actually get you hired in today\'s job market. Ignite courses are free with the ability to get additional career tips and support with Ignite Insider.'
  },
  {
    question: 'Who is Ignite for?',
    answer: 'Ignite is for anyone ready to level up their career. It is especially useful for young professionals looking to break into competitive fields, people looking to switch careers, re-enter the job market or those looking to gain new skills entirely.'
  },
  {
    question: 'How much does Ignite cost?',
    answer: 'All Ignite courses and resources are completely free. In addition, we offer Ignite Insider which offers 1:1 access to industry professionals and curated job opportunity notifications.'
  },
  {
    question: 'What can I learn on Ignite?',
    answer: 'We offer comprehensive courses across Product Management, Cyber Security and Marketing, with more fields launching soon. Each course includes interactive lessons, knowledge checks and certification to boost your CV. You can submit a request for a new course if we don\'t yet offer it.'
  },
  {
    question: 'Can I learn at my own pace?',
    answer: 'Absolutely. Ignite courses are self-paced, so you can learn when and where it works best for you. We suggest completing 2 to 4 lessons per week for the best results and maximum knowledge retention.'
  },
  {
    question: 'What makes Ignite different?',
    answer: 'Unlike other platforms, Ignite courses are completely free with no hidden costs. We focus on practical, industry-relevant skills that employers actually want, not just theory. Our courses get you job-ready, fast.'
  }
]
