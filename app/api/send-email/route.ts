import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { AuditReport } from '@/lib/types'

function scoreColor(score: number) {
  if (score >= 70) return '#16a34a'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

function levelColor(level: string) {
  if (level === 'high') return '#16a34a'
  if (level === 'medium') return '#d97706'
  return '#dc2626'
}

function buildEmailHtml(name: string, report: AuditReport): string {
  const scoreCol = scoreColor(report.overallScore)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your AI Visibility Report</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">

  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

    <div style="background:#111827;padding:32px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">AI Visibility Report</p>
      <h1 style="color:#fff;font-size:24px;margin:0 0 4px;">${report.businessName}</h1>
      <p style="color:#6b7280;font-size:13px;margin:0;">${report.websiteUrl}</p>
    </div>

    <div style="padding:32px;">
      <p style="font-size:15px;color:#374151;margin:0 0 24px;">Hi ${name}, here is your AI Visibility Report.</p>

      <div style="background:#f9fafb;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="font-size:14px;color:#6b7280;margin:0 0 8px;">Overall AI Visibility Score</p>
        <p style="font-size:56px;font-weight:700;color:${scoreCol};margin:0 0 8px;">${report.overallScore}</p>
        <p style="font-size:13px;color:#6b7280;margin:0;">out of 100</p>
        <p style="font-size:15px;color:#374151;margin:16px 0 0;">${report.headline}</p>
      </div>

      <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 12px;">Platform Readiness</h2>
      ${report.platforms.map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:14px;color:#374151;">${p.name}</span>
          <div style="text-align:right;">
            <span style="font-size:13px;font-weight:600;color:${levelColor(p.level)};text-transform:capitalize;">${p.level}</span>
            <p style="font-size:12px;color:#6b7280;margin:2px 0 0;max-width:300px;">${p.reason}</p>
          </div>
        </div>
      `).join('')}

      <h2 style="font-size:16px;font-weight:600;color:#111827;margin:24px 0 12px;">Your Top Recommendations</h2>
      ${report.recommendations.slice(0, 5).map((r, i) => `
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:10px;">
          <div style="display:flex;gap:12px;">
            <span style="background:#111827;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;">${i + 1}</span>
            <div>
              <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 4px;">${r.title}</p>
              <p style="font-size:13px;color:#6b7280;margin:0 0 6px;">${r.why}</p>
              <span style="font-size:11px;color:#9ca3af;text-transform:capitalize;">Effort: ${r.effort}</span>
            </div>
          </div>
        </div>
      `).join('')}

      ${report.quickWins.length > 0 ? `
        <h2 style="font-size:16px;font-weight:600;color:#111827;margin:24px 0 12px;">Quick Wins — Do These First</h2>
        ${report.quickWins.map(w => `
          <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <span style="color:#16a34a;font-size:16px;">✓</span>
            <p style="font-size:14px;color:#374151;margin:0;">${w}</p>
          </div>
        `).join('')}
      ` : ''}

      <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin-top:24px;text-align:center;">
        <p style="font-size:13px;color:#166534;margin:0;">This report is valued at $297 — provided to you completely free.</p>
      </div>

      <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;text-align:center;">
        Generated on ${new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  </div>
</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, report } = await req.json()

    if (!name || !email || !report) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'reports@aivisibility.ai'

    await resend.emails.send({
      from: `AI Visibility Report <${fromEmail}>`,
      to: email,
      subject: `Your AI Visibility Report — ${report.businessName}`,
      html: buildEmailHtml(name, report),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to send email.' }, { status: 500 })
  }
}
