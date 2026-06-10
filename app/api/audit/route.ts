import { NextRequest, NextResponse } from 'next/server'
import { crawlWebsite } from '@/lib/crawler'
import { generateReport } from '@/lib/claude'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid website URL.' }, { status: 400 })
    }

    const crawlData = await crawlWebsite(url)
    const report = await generateReport(crawlData)

    return NextResponse.json({ report })
  } catch (err: any) {
    const message = err?.message || 'Something went wrong. Please try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
