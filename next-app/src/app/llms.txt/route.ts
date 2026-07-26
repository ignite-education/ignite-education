import { getCoursesByType } from '@/lib/courseData'
import { getAllPublishedPosts } from '@/lib/blogData'
import { getAllPrompts } from '@/data/placeholderPrompts'
import { professionToSlug } from '@/lib/professionUtils'
import { getFirstSentence } from '@/lib/courseUtils'
import { SITE_URL, SITE_NAME, ORG_EMAIL } from '@/lib/siteConfig'
import type { Course } from '@/types/course'

export const revalidate = 3600

/**
 * /llms.txt — a plain-text summary of the site for LLMs and AI assistants,
 * following the llmstxt.org convention.
 *
 * Generated, not hand-written. The previous static public/llms.txt listed 8 of
 * 24 courses, no blog, none of the 51 prompt URLs, and described Ignite as
 * "specializing in product management" — a positioning two catalogue expansions
 * out of date. Anything hand-maintained here goes stale the moment a course
 * ships, so it reads the same Supabase data the pages do.
 *
 * Worth being clear-eyed about impact: the major AI crawlers (GPTBot,
 * ClaudeBot, PerplexityBot, OAI-SearchBot) overwhelmingly ignore this file and
 * crawl HTML directly, and Google has said on record it does not support it.
 * The structured data and server-rendered content do the real work. This exists
 * so that the tools which DO read it get an accurate picture rather than a
 * misleading one.
 */

const slugFor = (course: Course) => course.name.toLowerCase().replace(/\s+/g, '-')

function courseLines(courses: Course[]): string {
  return courses
    .map((course) => {
      const title = course.title || course.name
      const summary = course.description ? getFirstSentence(course.description).trim() : ''
      const modules = course.module_structure?.length ?? 0
      const lessons =
        course.module_structure?.reduce((n, m) => n + (m.lessons?.length ?? 0), 0) ?? 0
      const facts = [
        modules ? `${modules} module${modules === 1 ? '' : 's'}` : null,
        lessons ? `${lessons} lesson${lessons === 1 ? '' : 's'}` : null,
        course.status === 'coming_soon' ? 'coming soon' : 'available now',
      ]
        .filter(Boolean)
        .join(', ')
      return `- [${title}](${SITE_URL}/courses/${slugFor(course)}): ${summary} (${facts})`
    })
    .join('\n')
}

export async function GET() {
  const [coursesByType, posts, prompts] = await Promise.all([
    getCoursesByType(),
    getAllPublishedPosts(),
    getAllPrompts(),
  ])

  const totalCourses =
    coursesByType.specialism.length + coursesByType.skill.length + coursesByType.subject.length

  // Group prompts by profession so the toolkit is navigable rather than a flat
  // list of 40+ near-identical lines.
  const byProfession = new Map<string, number>()
  for (const prompt of prompts) {
    byProfession.set(prompt.profession, (byProfession.get(prompt.profession) ?? 0) + 1)
  }

  const sections: string[] = [
    `# ${SITE_NAME}`,
    '',
    '> Free online courses in careers, skills and subjects. Every course is free with no prerequisites, built with industry practitioners, and awards a certificate on completion. Based in London, UK.',
    '',
    `Ignite Education offers ${totalCourses} free courses across three types: **specialisms** (full career paths), **skills** (focused capabilities you can apply immediately), and **subjects** (in-depth study of a topic). Courses are self-paced and interactive, with AI-supported lessons, knowledge checks and real-world projects.`,
    '',
    'Everything on the platform is free. There are no paid tiers on course content.',
    '',
    '## Key facts',
    '',
    `- Website: ${SITE_URL}`,
    `- Contact: ${ORG_EMAIL}`,
    '- Location: London, United Kingdom',
    '- Cost: free — all courses, all content',
    '- Prerequisites: none',
    '- Format: online, self-paced',
    '- Certificate: yes, on completion of any course',
    '- Language: English (en-GB)',
    '',
    '## Specialisms — full career paths',
    '',
    courseLines(coursesByType.specialism),
    '',
    '## Skills — focused, immediately applicable',
    '',
    courseLines(coursesByType.skill),
    '',
    '## Subjects — in-depth study',
    '',
    courseLines(coursesByType.subject),
    '',
    '## AI prompt toolkit',
    '',
    `Free, ready-to-use prompt templates for ChatGPT, Claude, Copilot and Gemini, organised by profession. Index: ${SITE_URL}/prompts`,
    '',
    [...byProfession.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(
        ([profession, count]) =>
          `- [${profession} prompts](${SITE_URL}/prompts/${professionToSlug(profession)}): ${count} template${count === 1 ? '' : 's'}`
      )
      .join('\n'),
    '',
    '## Blog',
    '',
    `Index: ${SITE_URL}/blog`,
    '',
    posts.length
      ? posts
          .map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.excerpt ?? ''}`)
          .join('\n')
      : '- No posts published yet.',
    '',
    '## Other pages',
    '',
    `- [Course catalogue](${SITE_URL}/courses): browse and search all ${totalCourses} courses`,
    `- [Sign in / create a free account](${SITE_URL}/sign-in)`,
    `- [Release notes](${SITE_URL}/release-notes): what shipped recently`,
    `- [Privacy policy](${SITE_URL}/privacy)`,
    `- [Terms of service](${SITE_URL}/terms)`,
    '',
  ]

  return new Response(sections.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
