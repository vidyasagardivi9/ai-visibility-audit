export interface CheckResult {
  score: number
  status: 'good' | 'warning' | 'poor'
  title: string
  summary: string
  details: string[]
  howToFix?: string
}

export interface Competitor {
  name: string
  advantage: string
  whyItMatters: string
}

export interface Recommendation {
  priority: number
  title: string
  why: string
  howTo: string
  impact: string
  effort: 'easy' | 'medium' | 'takes time'
}

export interface PlatformScore {
  name: string
  level: 'low' | 'medium' | 'high'
  reason: string
  whatWouldHelp: string
}

export interface AuditReport {
  businessName: string
  businessType: string
  websiteUrl: string
  overallScore: number
  headline: string
  summary: string
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
  verifiedListings: string[]
  searchSnippets: string[]
  businessName: string
}
