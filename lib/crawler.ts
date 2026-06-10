import * as cheerio from 'cheerio'
import type { CrawlData } from './types'

const SOCIAL_DOMAINS = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'youtube.com', 'tiktok.com']
const DIRECTORY_DOMAINS = [
  'google.com/maps', 'yelp.com', 'tripadvisor.com', 'g2.com', 'capterra.com',
  'trustpilot.com', 'bbb.org', 'yellowpages.com', 'angi.com', 'houzz.com',
  'thumbtack.com', 'clutch.co', 'producthunt.com', 'crunchbase.com',
  'glassdoor.com', 'indeed.com', 'zomato.com', 'opentable.com',
]

function normalizeUrl(input: string): string {
  let url = input.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  return url
}

function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return url
  }
}

export async function crawlWebsite(inputUrl: string): Promise<CrawlData> {
  const url = normalizeUrl(inputUrl)
  const base = getBaseUrl(url)

  const fetchOptions: RequestInit = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AIVisibilityBot/1.0; +https://aivisibility.ai)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  }

  let html = ''
  try {
    const res = await fetch(url, fetchOptions)
    html = await res.text()
  } catch {
    throw new Error(`Could not reach ${url}. Please check the URL and try again.`)
  }

  const $ = cheerio.load(html)

  const title = $('title').first().text().trim() || ''
  const description = $('meta[name="description"]').attr('content')?.trim() ||
                      $('meta[property="og:description"]').attr('content')?.trim() || ''
  const h1 = $('h1').first().text().trim() || ''

  const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 4000)

  const jsonLdTypes: string[] = []
  const jsonLdRaw: string[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html() || ''
    jsonLdRaw.push(raw)
    try {
      const parsed = JSON.parse(raw)
      const types = Array.isArray(parsed) ? parsed.map((p: any) => p['@type']) : [parsed['@type']]
      types.filter(Boolean).forEach((t: string) => jsonLdTypes.push(t))
    } catch {}
  })

  const socialLinks: string[] = []
  const directoryLinks: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (SOCIAL_DOMAINS.some(d => href.includes(d))) socialLinks.push(href)
    if (DIRECTORY_DOMAINS.some(d => href.includes(d))) directoryLinks.push(href)
  })

  const phoneRegex = /(\+?[\d\s\-().]{7,})/g
  const hasPhone = phoneRegex.test(bodyText)
  const hasAddress = /\b(street|ave|avenue|road|rd|blvd|drive|dr|lane|ln|suite|ste|floor|fl)\b/i.test(bodyText)
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(bodyText)

  let llmsTxtContent = ''
  let hasLlmsTxt = false
  try {
    const llmsRes = await fetch(`${base}/llms.txt`, fetchOptions)
    if (llmsRes.ok) {
      hasLlmsTxt = true
      llmsTxtContent = (await llmsRes.text()).slice(0, 2000)
    }
  } catch {}

  let robotsContent = ''
  try {
    const robotsRes = await fetch(`${base}/robots.txt`, fetchOptions)
    if (robotsRes.ok) robotsContent = (await robotsRes.text()).slice(0, 1000)
  } catch {}

  return {
    url,
    title,
    description,
    h1,
    bodyText,
    jsonLdTypes,
    jsonLdRaw,
    hasLlmsTxt,
    llmsTxtContent,
    robotsContent,
    socialLinks: Array.from(new Set(socialLinks)),
    directoryLinks: Array.from(new Set(directoryLinks)),
    hasPhone,
    hasAddress,
    hasEmail,
  }
}
