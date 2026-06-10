'use client'

import { useState, useEffect, useRef } from 'react'
import type { AuditReport } from '@/lib/types'

type AppState = 'input' | 'loading' | 'email' | 'report'

const LOADING_STEPS = [
  { label: 'Scanning your website…', duration: 4000 },
  { label: 'Checking schema markup…', duration: 3000 },
  { label: 'Looking for llms.txt…', duration: 2000 },
  { label: 'Detecting your competitors…', duration: 5000 },
  { label: 'Analyzing AI visibility signals…', duration: 4000 },
  { label: 'Writing your report…', duration: 6000 },
]

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-green-600 bg-green-50 border-green-200'
    : score >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold border ${color}`}>
      {score}/100
    </span>
  )
}

function StatusIcon({ status }: { status: 'good' | 'warning' | 'poor' }) {
  if (status === 'good') return <span className="text-green-500 text-lg">✓</span>
  if (status === 'warning') return <span className="text-amber-500 text-lg">⚠</span>
  return <span className="text-red-500 text-lg">✗</span>
}

function LevelPill({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${styles[level]}`}>
      {level}
    </span>
  )
}

function EffortPill({ effort }: { effort: string }) {
  const styles: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-blue-100 text-blue-700',
    'takes time': 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[effort] || 'bg-gray-100 text-gray-600'}`}>
      {effort}
    </span>
  )
}

export default function Home() {
  const [state, setState] = useState<AppState>('input')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [report, setReport] = useState<AuditReport | null>(null)
  const [auditError, setAuditError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (state !== 'loading') return
    let step = 0
    const advance = () => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1)
      setLoadingStep(step)
      if (step < LOADING_STEPS.length - 1) {
        stepTimerRef.current = setTimeout(advance, LOADING_STEPS[step].duration)
      }
    }
    stepTimerRef.current = setTimeout(advance, LOADING_STEPS[0].duration)
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current) }
  }, [state])

  async function runAudit() {
    setUrlError('')
    const trimmed = url.trim()
    if (!trimmed) { setUrlError('Please enter your website URL.'); return }

    setState('loading')
    setLoadingStep(0)

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setAuditError(data.error || 'Something went wrong. Please try again.')
        setState('input')
        return
      }
      setReport(data.report)
      setState('email')
    } catch {
      setAuditError('Could not connect. Please check your internet connection and try again.')
      setState('input')
    }
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setSendingEmail(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, report }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setEmailError(data.error || 'Failed to send email. Please try again.')
      } else {
        setEmailSent(true)
        setState('report')
      }
    } catch {
      setEmailError('Failed to send email. You can still view your report below.')
    } finally {
      setSendingEmail(false)
    }
  }

  function skipEmail() {
    setState('report')
  }

  if (state === 'input') {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-xl text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-1.5 rounded-full mb-8 font-medium">
              <span className="text-green-500">●</span> Free audit — normally $297
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              Can AI assistants find your business?
            </h1>
            <p className="text-lg text-gray-500 mb-10">
              Find out how visible you are on ChatGPT, Gemini, and Perplexity — and exactly what to fix.
            </p>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 text-left mb-2">
                Your website URL
              </label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runAudit()}
                placeholder="https://yourbusiness.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {urlError && <p className="text-red-500 text-sm mt-2 text-left">{urlError}</p>}
              {auditError && <p className="text-red-500 text-sm mt-2 text-left">{auditError}</p>}
              <button
                onClick={runAudit}
                className="w-full mt-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
              >
                Check my AI visibility →
              </button>
              <p className="text-xs text-gray-400 mt-3">No account needed. Takes 2–3 minutes.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8 text-center">
              {['Schema markup', 'llms.txt check', 'Competitor analysis'].map(item => (
                <div key={item} className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-500">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (state === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin mx-auto mb-8" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {LOADING_STEPS[loadingStep].label}
          </h2>
          <p className="text-gray-500 text-sm mb-8">This takes 2–3 minutes. Please keep this tab open.</p>
          <div className="flex justify-center gap-2">
            {LOADING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i <= loadingStep ? 'bg-gray-900 w-6' : 'bg-gray-200 w-3'
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (state === 'email' && report) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your report is ready</h2>
          <p className="text-gray-500 mb-8">
            Enter your name and email to receive a copy, then we'll show your full report.
          </p>

          <form onSubmit={sendEmail} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@yourbusiness.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            {emailError && <p className="text-red-500 text-sm mb-4">{emailError}</p>}
            <button
              type="submit"
              disabled={sendingEmail}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              {sendingEmail ? 'Sending…' : 'Send my report & view it now →'}
            </button>
          </form>

          <button
            onClick={skipEmail}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Skip and view report
          </button>
        </div>
      </main>
    )
  }

  if (state === 'report' && report) {
    const scoreColor = report.overallScore >= 70 ? 'text-green-600'
      : report.overallScore >= 40 ? 'text-amber-600' : 'text-red-600'

    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">

          {emailSent && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-green-700 text-sm">
              <span>✓</span> Report sent to {email}
            </div>
          )}

          <div className="bg-gray-900 rounded-2xl p-8 text-center mb-6">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">AI Visibility Report</p>
            <h1 className="text-white text-2xl font-bold mb-1">{report.businessName}</h1>
            <p className="text-gray-500 text-sm">{report.websiteUrl}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Overall AI Visibility Score</p>
            <p className={`text-7xl font-bold mb-2 ${scoreColor}`}>{report.overallScore}</p>
            <p className="text-gray-400 text-sm mb-4">out of 100</p>
            <p className="text-gray-700 text-base">{report.headline}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-1.5 rounded-full font-medium">
              <span>✓</span> This audit is normally $297 — free for you
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Platform readiness</h2>
            <div className="space-y-4">
              {report.platforms.map(p => (
                <div key={p.name} className="flex items-start justify-between gap-4">
                  <span className="font-medium text-gray-800 text-sm w-24 shrink-0">{p.name}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{p.reason}</p>
                  </div>
                  <LevelPill level={p.level} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Audit results</h2>
            <div className="space-y-4">
              {Object.entries(report.checks).map(([key, check]) => (
                <div key={key} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={check.status} />
                      <span className="font-medium text-gray-900 text-sm">{check.title}</span>
                    </div>
                    <ScoreBadge score={check.score} />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{check.summary}</p>
                  <ul className="space-y-1">
                    {check.details.map((d, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span className="shrink-0">·</span>{d}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {report.competitors.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">What competitors are doing better</h2>
              <div className="space-y-3">
                {report.competitors.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.advantage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Your top recommendations</h2>
            <div className="space-y-3">
              {report.recommendations.map((r, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-1">{r.title}</p>
                      <p className="text-sm text-gray-600 mb-2">{r.why}</p>
                      <EffortPill effort={r.effort} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {report.quickWins.length > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-6 mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Quick wins — do these first</h2>
              <div className="space-y-3">
                {report.quickWins.map((w, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-green-600 text-base shrink-0">✓</span>
                    <p className="text-sm text-gray-700">{w}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center mt-8 mb-4">
            <button
              onClick={() => { setState('input'); setUrl(''); setReport(null); setEmailSent(false); }}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Run another audit
            </button>
          </div>
        </div>
      </main>
    )
  }

  return null
}
