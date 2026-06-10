import * as cheerio from 'cheerio'
import type { CrawlData } from './types'

const SOCIAL_DOMAINS = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'youtube.com', 'tiktok.com']

const DIRECTORY_CHECKS = [
  { name: 'Google Business Profile', domain: 'google.com/maps' },
  { name: 'Google Business Profile', domain: 'business.google.com' },
  { name: 'Yelp', domain: 'yelp.com' },
  { name: 'TripAdvisor', domain: 'tripadvisor.com' },
  { name: 'G2', domain: 'g2.com' },
  { name: 'Capterra', domain: 'capterra.com' },
  { name: 'Trustpilot', domain: 'trustpilot.com' },
  { name: 'BBB', domain: 'bbb.org' },
  { name: 'Yellow Pages', domain: 'yellowpages.com' },
  { name: 'Angi', domain: 'angi.com' },
  { name: 'Clutch', domain: 'clutch.co' },
  { name: 'Product Hunt', domain: 'producthunt.com' },
  { name: 'Crunchbase', domain: 'crunchbase.com' },
  { name: 'Facebook', domain: 'facebook.com' },
  { name: 'LinkedIn', domain: 'linkedin.com' },
  { name: 'Foursquare', domain: 'foursquare.com' },
  { name: 'Apple Maps', domain: 'maps.apple.com' },
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

function extractBusinessName(title: string, h1: string, url: string): string {
  const titleParts = title.split(/[|\-–—]/)
  if (titleParts[0]?.trim().length > 2) return titleParts[0].trim()
  if (h1?.trim().length > 2) return h1.trim()
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain.split('.')[0].replace(/-/g, ' ')
  } catch {
    return ''
  }
}

function extractPhone(text: string): string {
  // Match phone numbers: international, local formats
  const match = text.match(/(\+?[\d]{1,3}[\s\-.]?)?(\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/)?.[0]
  return match ? match.trim().replace(/\s+/g, ' ') : ''
}

function extractAddress(text: string): string {
  // Try to find address-like patterns
  const match = text.match(/\d{1,5}\s+[A-Za-z0-9\s,.-]{5,60}(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct|Suite|Ste)[.,\s]*/i)?.[0]
  return match ? match.trim().slice(0, 100) : ''
}

function parseSearchResults(html: string): { links: string[], snippets: string[] } {
  const $ = cheerio.load(html)
  const links: string[] = []
  const snippets: string[] = []

  $('.result__snippet').each((_, el) => {
    const text = $(el).text().trim()
    if (text) snippets.push(text.slice(0, 200))
  })

  $('.result__url').each((_, el) => {
    links.push($(el).text().trim().toLowerCase())
  })

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href.includes('uddg=')) {
      try {
        const decoded = decodeURIComponent(href.split('uddg=')[1] || '')
        links.push(decoded.toLowerCase())
      } catch {}
    }
  })

  return { links, snippets }
}

async function ddgSearch(query: string): Promise<{ links: string[], snippets: string[] }> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { links: [], snippets: [] }
    return parseSearchResults(await res.text())
  } catch {
    return { links: [], snippets: [] }
  }
}

function findListingsInLinks(links: string[]): string[] {
  const found: string[] = []
  for (const dir of DIRECTORY_CHECKS) {
    if (links.some(l => l.includes(dir.domain)) && !found.includes(dir.name)) {
      found.push(dir.name)
    }
  }
  return found
}

async function searchWebPresence(
  businessName: string,
  phone: string,
  address: string,
): Promise<{ verifiedListings: string[], snippets: string[] }> {
  const allLinks: string[] = []
  const allSnippets: string[] = []

  // Search 1: by business name
  if (businessName && businessName.length > 2) {
    const r = await ddgSearch(`"${businessName}"`)
    allLinks.push(...r.links)
    allSnippets.push(...r.snippets)
  }

  // Search 2: by phone number (very reliable for finding directory listings)
  if (phone && phone.length > 6) {
    const r = await ddgSearch(phone)
    allLinks.push(...r.links)
    allSnippets.push(...r.snippets)
  }

  // Search 3: by business name + address (if found)
  if (businessName && address) {
    const r = await ddgSearch(`"${businessName}" "${address.slice(0, 50)}"`)
    allLinks.push(...r.links)
    allSnippets.push(...r.snippets)
  }

  const verifiedListings = findListingsInLinks(allLinks)
  return {
    verifiedListings,
    snippets: Array.from(new Set(allSnippets)).slice(0, 10),
  }
}

export async function crawlWebsite(inputUrl: string): Promise<CrawlData> {
  const url = normalizeUrl(inputUrl)
  const base = getBaseUrl(url)

  const fetchOptions: RequestInit = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AIVisibilityBot/1.0)',
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
  const outboundDirectoryLinks: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (SOCIAL_DOMAINS.some(d => href.includes(d))) socialLinks.push(href)
    if (DIRECTORY_CHECKS.some(d => href.includes(d.domain))) outboundDirectoryLinks.push(href)
  })

  const phone = extractPhone(bodyText)
  const address = extractAddress(bodyText)
  const hasPhone = !!phone
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

  const businessName = extractBusinessName(title, h1, url)

  const { verifiedListings, snippets } = await searchWebPresence(businessName, phone, address)

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
    directoryLinks: Array.from(new Set(outboundDirectoryLinks)),
    hasPhone,
    hasAddress,
    hasEmail,
    verifiedListings,
    searchSnippets: snippets,
    businessName,
  }
}
