import OpenAI from 'openai'
import type { CrawlData, AuditReport } from './types'
import { scoreSchema, scoreLlmsTxt, scoreCitations, scoreDirectories, calculateOverallScore } from './scorer'

export async function generateReport(data: CrawlData): Promise<AuditReport> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const schema = scoreSchema(data)
  const llmsTxt = scoreLlmsTxt(data)
  const citations = scoreCitations(data)
  const directories = scoreDirectories(data)
  const overallScore = calculateOverallScore([schema.score, llmsTxt.score, citations.score, directories.score])

  const prompt = `You are an expert AI visibility consultant analyzing a business website. Your job is to produce a DETAILED, SPECIFIC, ACTIONABLE report — not generic advice. Every recommendation must reference something specific you found (or didn't find) on this exact website.

=== WEBSITE DATA ===
URL: ${data.url}
Page Title: ${data.title}
Meta Description: ${data.description}
H1 Heading: ${data.h1}
Page Content (first 2500 chars): ${data.bodyText.slice(0, 2500)}

=== TECHNICAL AUDIT FINDINGS ===
Schema markup types found: ${data.jsonLdTypes.length > 0 ? data.jsonLdTypes.join(', ') : 'NONE — no structured data found at all'}
Raw schema snippets: ${data.jsonLdRaw.slice(0, 2).join(' | ').slice(0, 500) || 'none'}
Has llms.txt file: ${data.hasLlmsTxt ? 'YES' : 'NO — missing'}
llms.txt content: ${data.llmsTxtContent || 'n/a'}
robots.txt content: ${data.robotsContent.slice(0, 300) || 'not found'}
Phone number on site: ${data.hasPhone ? 'Yes' : 'No — not found'}
Physical address on site: ${data.hasAddress ? 'Yes' : 'No — not found'}
Email address on site: ${data.hasEmail ? 'Yes' : 'No — not found'}
Social media profile links found: ${data.socialLinks.length > 0 ? data.socialLinks.join(', ') : 'NONE'}
Business directory links found: ${data.directoryLinks.length > 0 ? data.directoryLinks.join(', ') : 'NONE — not listed on any directories'}
Overall AI visibility score: ${overallScore}/100

=== YOUR TASK ===
Return ONLY a raw JSON object (no markdown code blocks, no explanation, just the JSON) with this exact structure. Every field must be filled with SPECIFIC details about THIS business — not generic filler text.

{
  "businessName": "clean business name extracted from site",
  "businessType": "specific description e.g. 'Plumbing services company in Austin, TX' or 'SaaS project management tool for remote teams'",
  "headline": "One honest sentence summarizing their AI visibility situation. Be specific. E.g. 'Your plumbing business is nearly invisible to AI assistants because you have no schema markup, no directory listings, and no llms.txt file.'",
  "summary": "3-4 sentences. What is this business, what did we find, what is the biggest problem, and what is the biggest opportunity. Be specific to what you found on their site.",
  "platforms": [
    {
      "name": "ChatGPT",
      "level": "low|medium|high",
      "reason": "Specific reason based on actual findings. E.g. 'ChatGPT learns from web crawls and citations — your site has no schema markup and isn't listed on any directories ChatGPT uses as sources.'",
      "whatWouldHelp": "One specific action. E.g. 'Add Organization schema to your homepage and claim your Google Business Profile.'"
    },
    {
      "name": "Gemini",
      "level": "low|medium|high",
      "reason": "Specific reason. Gemini heavily uses Google's index — mention whether they have Google Business Profile signals, schema, etc.",
      "whatWouldHelp": "One specific action."
    },
    {
      "name": "Perplexity",
      "level": "low|medium|high",
      "reason": "Specific reason. Perplexity relies on web citations and authoritative sources — mention whether they appear citable.",
      "whatWouldHelp": "One specific action."
    }
  ],
  "competitors": [
    {
      "name": "Real competitor name based on business type",
      "advantage": "Specific thing they almost certainly do better. E.g. 'Likely has 50+ directory listings vs your 0'",
      "whyItMatters": "Why this gap hurts you in AI search. 1-2 sentences."
    },
    {
      "name": "Second competitor",
      "advantage": "...",
      "whyItMatters": "..."
    },
    {
      "name": "Third competitor",
      "advantage": "...",
      "whyItMatters": "..."
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "title": "Specific action title referencing their situation",
      "why": "2-3 sentences explaining exactly why this matters for THIS business based on what we found. Reference specific gaps found in the audit.",
      "howTo": "Step-by-step instructions a non-technical person can follow. At least 3 specific steps. Name the exact tools, websites, or places they need to go.",
      "impact": "What will change after doing this. Be specific. E.g. 'AI assistants will be able to identify you as a plumbing business in Austin and recommend you when someone asks for a plumber nearby.'",
      "effort": "easy|medium|takes time"
    },
    { "priority": 2, "title": "...", "why": "...", "howTo": "...", "impact": "...", "effort": "..." },
    { "priority": 3, "title": "...", "why": "...", "howTo": "...", "impact": "...", "effort": "..." },
    { "priority": 4, "title": "...", "why": "...", "howTo": "...", "impact": "...", "effort": "..." },
    { "priority": 5, "title": "...", "why": "...", "howTo": "...", "impact": "...", "effort": "..." }
  ],
  "quickWins": [
    "Specific win #1 with exact instruction — e.g. 'Go to google.com/business and claim your free Google Business Profile. It takes 15 minutes and immediately makes you visible on Google Maps and in Google's AI answers.'",
    "Specific win #2 with exact instruction",
    "Specific win #3 with exact instruction"
  ]
}

IMPORTANT RULES:
- Every sentence must reference something specific found (or missing) on their actual website
- howTo must have real step-by-step instructions a non-technical business owner can follow TODAY
- Name real websites, tools, and platforms (e.g. 'go to schema.org/Organization', 'search your business on yelp.com/biz/add')
- Do not write generic advice like 'improve your content' — be specific
- Write like a trusted advisor explaining things to a friend who owns a small business
- Tone: direct, clear, encouraging — not salesy`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.choices[0]?.message?.content || ''

  let parsed: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
  } catch {
    throw new Error('Failed to parse AI response. Please try again.')
  }

  return {
    businessName: parsed.businessName || new URL(data.url).hostname,
    businessType: parsed.businessType || '',
    websiteUrl: data.url,
    overallScore,
    headline: parsed.headline || '',
    summary: parsed.summary || '',
    checks: { schema, llmsTxt, citations, directories },
    platforms: parsed.platforms || [],
    competitors: parsed.competitors || [],
    recommendations: parsed.recommendations || [],
    quickWins: parsed.quickWins || [],
    generatedAt: new Date().toISOString(),
  }
}
