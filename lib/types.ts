export interface CheckResult {
  score: number
  status: 'good' | 'warning' | 'poor'
  title: string
  summary: string
  details: string[]
}

export interface Competitor {
  name: string
  advantage: string
}

export interface Recommendation {
  priority: number
  title: string
  why: string
  effort: 'easy' | 'medium' | 'takes time'
}

export interface PlatformScore {
  name: string
  level: 'low' | 'medium' | 'high'
  reason: string
}

export interface AuditReport {
  businessName: string
  websiteUrl: string
  overallScore: number
  headline: string
  checks: {
    schema: CheckResult
    llmsTxt: CheckResult
    citations: CheckResult
    directories: CheckResult
  }
  platforms: PlatformScore[]
  competitors: Competitor[]
  recommendations: Recommendation[]
  quickWins: string[]
  generatedAt: string
}

export interface CrawlData {
  url: string
  title: string
  description: string
  h1: string
  bodyText: string
  jsonLdTypes: string[]
  jsonLdRaw: string[]
  hasLlmsTxt: boolean
  llmsTxtContent: string
  robotsContent: string
  socialLinks: string[]
  directoryLinks: string[]
  hasPhone: boolean
  hasAddress: boolean
  hasEmail: boolean
}
