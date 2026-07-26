import {
  SITE_URL,
  SITE_NAME,
  ORG_ID,
  SITE_ID,
  LOGO_ID,
  ORG_LOGO,
  ORG_EMAIL,
  ORG_LEGAL_NAME,
  SAME_AS,
} from '@/lib/siteConfig'

/**
 * The site-wide entity graph, rendered once from the root layout so it appears
 * on every Next-rendered page.
 *
 * Everything else that needs the organisation (Course.provider,
 * BlogPosting.publisher, Person.memberOf, …) references `{ '@id': ORG_ID }`
 * rather than redeclaring it. Search engines and LLMs then resolve one entity
 * instead of seven near-identical ones.
 */
export default function SiteJsonLd() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'EducationalOrganization'],
        '@id': ORG_ID,
        name: SITE_NAME,
        legalName: ORG_LEGAL_NAME,
        url: SITE_URL,
        email: ORG_EMAIL,
        sameAs: SAME_AS,
        logo: {
          '@type': 'ImageObject',
          '@id': LOGO_ID,
          url: ORG_LOGO,
          caption: SITE_NAME,
        },
        image: { '@id': LOGO_ID },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'London',
          addressCountry: 'GB',
        },
        description:
          'Ignite Education provides free, expert-built online courses in careers, skills and subjects, with interactive lessons and a certificate on completion.',
      },
      {
        '@type': 'WebSite',
        '@id': SITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': ORG_ID },
        inLanguage: 'en-GB',
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
