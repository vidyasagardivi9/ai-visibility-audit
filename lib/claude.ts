import Anthropic from '@anthropic-ai/sdk'
import type { CrawlData, AuditReport, CheckResult } from './types'
import { scoreSchema, scoreLlmsTxt, scoreCitations, scoreDirectories, calculateOverallScore } from './scorer'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateReport(data: CrawlData): Promise<AuditReport> {
  const schema = scoreSchema(data)
  const llmsTxt = scoreLlmsTxt(data)
  const citations = scoreCitations(data)
  const directories = scoreDirectories(data)
  const overallScore = calculateOverallScore([schema.score, llmsTxt.score, citations.score, directories.score])

  const prompt = `You are analyzing a business website for AI visibility. Here is what we found:

Website: ${data.url}
Title: ${data.title}
Description: ${data.description}
H1: ${data.h1}
Body text sample: ${data.bodyText.slice(0, 1500)}

Technical findings:
- Schema markup types: ${data.jsonLdTypes.length > 0 ? data.jsonLdTypes.join(', ') : 'None'}
- Has llms.txt: ${data.hasLlmsTxt}
- Has phone number: ${data.hasPhone}
- Has address: ${data.hasAddress}
- Has email: ${data.hasEmail}
- Social links found: ${data.socialLinks.length}
- Directory links found: ${data.directoryLinks.length}
- Overall AI visibility score: ${overallScore}/100

Your task: Return a JSON object (no markdown, raw JSON only) with this exact structure:
{
  "businessName": "detected business name",
  "headline": "one sentence plain-English summary of their AI visibility situation (max 20 words, honest, no hype)",
  "platforms": [
    { "name": "ChatGPT", "level": "low|medium|high", "reason": "one plain sentence why" },
    { "name": "Gemini", "level": "low|medium|high", "reason": "one plain sentence why" },
    { "name": "Perplexity", "level": "low|medium|high", "reason": "one plain sentence why" }
  ],
  "competitors": [
    { "name": "Competitor Name", "advantage": "one thing they likely do better for AI visibility" }
  ],
  "recommendations": [
    { "priority": 1, "title": "short action title", "why": "plain English reason (1-2 sentences)", "effort": "easy|medium|takes time" },
    { "priority": 2, "title": "...", "why": "...", "effort": "..." },
    { "priority": 3, "title": "...", "why": "...", "effort": "..." },
    { "priority": 4, "title": "...", "why": "...", "effort": "..." },
    { "priority": 5, "title": "...", "why": "...", "effort": "..." }
  ],
  "quickWins": [
    "Quick action 1 — specific and doable in under an hour",
    "Quick action 2 — specific and doable in under an hour"
  ]
}

Rules:
- businessName: extract from title/h1/domain, make it clean
- Platform levels based on actual signals found (not assumptions)
- Identify 3-5 likely competitors based on what this business sells
- Recommendations must be specific to THIS business, not generic
- Quick wins must be genuinely easy (claim a profile, add a phone number, etc.)
- No technical jargon anywhere — write for a non-technical business owner
- Be honest about gaps, but encouraging in tone`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0].type === 'text' ? message.content[0].text : ''

  let parsed: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
  } catch {
    throw new Error('Failed to parse AI response. Please try again.')
  }

  return {
    businessName: parsed.businessName || new URL(data.url).hostname,
    websiteUrl: data.url,
    overallScore,
    headline: parsed.headline || '',
    checks: { schema, llmsTxt, citations, directories },
    platforms: parsed.platforms || [],
    competitors: parsed.competitors || [],
    recommendations: parsed.recommendations || [],
    quickWins: parsed.quickWins || [],
    generatedAt: new Date().toISOString(),
  }
}
