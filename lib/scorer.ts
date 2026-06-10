import type { CrawlData, CheckResult } from './types'

const VALUABLE_SCHEMA_TYPES = [
  'Organization', 'LocalBusiness', 'Product', 'Service', 'FAQPage',
  'Article', 'WebSite', 'Person', 'BreadcrumbList', 'Review',
]

export function scoreSchema(data: CrawlData): CheckResult {
  if (data.jsonLdTypes.length === 0) {
    return {
      score: 0,
      status: 'poor',
      title: 'No structured data found',
      summary: 'Your site has no schema markup. AI assistants use structured data to understand and cite businesses.',
      details: ['No JSON-LD schema detected', 'AI models cannot easily identify your business type', 'Missing Organization or LocalBusiness schema'],
    }
  }

  const foundValuable = data.jsonLdTypes.filter(t => VALUABLE_SCHEMA_TYPES.includes(t))
  const score = Math.min(100, foundValuable.length * 25 + (data.jsonLdTypes.length > 0 ? 10 : 0))

  return {
    score,
    status: score >= 50 ? 'good' : 'warning',
    title: `Schema found: ${data.jsonLdTypes.join(', ')}`,
    summary: `Your site has ${data.jsonLdTypes.length} type(s) of structured data. ${foundValuable.length > 0 ? 'Good start.' : 'But they are not the most useful types for AI visibility.'}`,
    details: [
      ...foundValuable.map(t => `✓ ${t} schema present`),
      ...VALUABLE_SCHEMA_TYPES.filter(t => !data.jsonLdTypes.includes(t)).slice(0, 3).map(t => `Missing: ${t} schema`),
    ],
  }
}

export function scoreLlmsTxt(data: CrawlData): CheckResult {
  if (!data.hasLlmsTxt) {
    return {
      score: 0,
      status: 'poor',
      title: 'No llms.txt file',
      summary: 'llms.txt is a file that tells AI systems exactly what your business does. You don\'t have one.',
      details: ['Missing /llms.txt file', 'AI crawlers have no official guidance file', 'ChatGPT, Gemini, and Perplexity cannot read your preferred business description'],
    }
  }

  const hasContent = data.llmsTxtContent.length > 100
  return {
    score: hasContent ? 90 : 40,
    status: hasContent ? 'good' : 'warning',
    title: 'llms.txt file exists',
    summary: hasContent ? 'Great — you have a well-populated llms.txt file. AI systems can read your business description directly.' : 'You have an llms.txt file but it appears mostly empty.',
    details: hasContent
      ? ['✓ llms.txt found and has content', '✓ AI crawlers can find official business description']
      : ['llms.txt exists but has minimal content', 'Add a detailed business description', 'Include your services, location, and contact details'],
  }
}

export function scoreCitations(data: CrawlData): CheckResult {
  const signals = [
    data.hasPhone,
    data.hasAddress,
    data.hasEmail,
    data.socialLinks.length > 0,
    data.description.length > 80,
    data.title.length > 10,
  ].filter(Boolean).length

  const score = Math.round((signals / 6) * 100)

  return {
    score,
    status: score >= 70 ? 'good' : score >= 40 ? 'warning' : 'poor',
    title: `${signals} of 6 citation signals present`,
    summary: 'Citation signals are details that help AI systems confidently identify and mention your business.',
    details: [
      data.hasPhone ? '✓ Phone number on site' : 'Missing: phone number',
      data.hasAddress ? '✓ Address mentioned' : 'Missing: physical address',
      data.hasEmail ? '✓ Email address on site' : 'Missing: email address',
      data.socialLinks.length > 0 ? `✓ ${data.socialLinks.length} social profile link(s)` : 'Missing: social media links',
      data.description.length > 80 ? '✓ Good meta description' : 'Missing or thin meta description',
    ],
  }
}

export function scoreDirectories(data: CrawlData): CheckResult {
  const count = data.directoryLinks.length

  if (count === 0) {
    return {
      score: 0,
      status: 'poor',
      title: 'No directory listings detected',
      summary: 'Your site doesn\'t link to any business directories. AI assistants learn about businesses from these sources.',
      details: [
        'Not linked from Google Business, Yelp, or other directories',
        'AI models use directory data to verify businesses',
        'Competitors with directory listings rank higher in AI answers',
      ],
    }
  }

  const score = Math.min(100, count * 20)
  return {
    score,
    status: score >= 60 ? 'good' : 'warning',
    title: `Listed on ${count} director${count === 1 ? 'y' : 'ies'}`,
    summary: `You have links to ${count} business director${count === 1 ? 'y' : 'ies'} on your site. More is better for AI visibility.`,
    details: data.directoryLinks.slice(0, 5).map(l => `✓ ${new URL(l).hostname}`),
  }
}

export function calculateOverallScore(scores: number[]): number {
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}
