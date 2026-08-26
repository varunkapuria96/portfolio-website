import { createClient } from 'npm:@supabase/supabase-js'
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required')
}
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

type Posting = { title: string; location: string | null; job_url: string; description?: string | null }
type Company = { id: string; name: string; careers_url: string }
type ScoredRow = { user_id: string; company_id: string; title: string; location: string | null; job_url: string; match_score: number | null; match_reason: string | null }

function absoluteUrl(base: string, path: string): string {
  try {
    return new URL(path, base).toString()
  } catch {
    return path
  }
}

async function fetchGreenhouse(slug: string): Promise<Posting[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`)
  if (!res.ok) throw new Error(`Greenhouse API returned ${res.status}`)
  const data = await res.json()
  return (data.jobs || []).map((j: { title: string; absolute_url: string; location?: { name?: string }; content?: string }) => ({
    title: j.title,
    location: j.location?.name || null,
    job_url: j.absolute_url,
    description: j.content ? stripHtml(j.content) : null,
  }))
}

async function fetchLever(slug: string): Promise<Posting[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`)
  if (!res.ok) throw new Error(`Lever API returned ${res.status}`)
  const data = await res.json()
  return (data || []).map((j: { text: string; hostedUrl: string; categories?: { location?: string }; description?: string }) => ({
    title: j.text,
    location: j.categories?.location || null,
    job_url: j.hostedUrl,
    description: j.description ? stripHtml(j.description) : null,
  }))
}

async function fetchAshby(slug: string): Promise<Posting[]> {
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)
  if (!res.ok) throw new Error(`Ashby API returned ${res.status}`)
  const data = await res.json()
  return (data.jobs || []).map((j: { title: string; jobUrl: string; location?: string; descriptionHtml?: string }) => ({
    title: j.title,
    location: j.location || null,
    job_url: j.jobUrl,
    description: j.descriptionHtml ? stripHtml(j.descriptionHtml) : null,
  }))
}

async function fetchWorkday(tenant: string, wdHost: string, site: string): Promise<Posting[]> {
  const base = `https://${tenant}.${wdHost}`
  const res = await fetch(`${base}/wday/cxs/${tenant}/${site}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: '' }),
  })
  if (!res.ok) throw new Error(`Workday API returned ${res.status}`)
  const data = await res.json()
  return (data.jobPostings || []).map((j: { title: string; externalPath: string; locationsText?: string }) => ({
    title: j.title,
    location: j.locationsText || null,
    job_url: absoluteUrl(base, `/${site}${j.externalPath}`),
    description: null,
  }))
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000)
}

async function fetchViaAi(careersUrl: string): Promise<Posting[]> {
  const res = await fetch(careersUrl)
  if (!res.ok) throw new Error(`Careers page returned ${res.status}`)
  const html = await res.text()
  const text = stripHtml(html)
  if (!text) return []

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [
      {
        name: 'extract_job_postings',
        description: 'Extract job postings listed on a company careers page',
        input_schema: {
          type: 'object',
          properties: {
            jobs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  location: { type: 'string', description: 'Empty string if not shown' },
                  url: { type: 'string', description: 'Absolute URL to the job posting, resolved against the base URL' },
                  description: { type: 'string', description: 'Brief summary of the role/requirements if shown on the page, empty string otherwise' },
                },
                required: ['title', 'location', 'url', 'description'],
              },
            },
          },
          required: ['jobs'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'extract_job_postings' },
    messages: [
      {
        role: 'user',
        content: `Base URL: ${careersUrl}\n\nExtracted page text:\n${text}\n\nExtract every open job posting listed on this page using the extract_job_postings tool. Resolve any relative links against the base URL. If this doesn't look like a job listing page, or no postings are found, call the tool with an empty jobs array.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(b => b.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') return []
  const extracted = toolUseBlock.input as { jobs: { title: string; location: string; url: string; description: string }[] }
  if (!Array.isArray(extracted?.jobs)) return []
  return extracted.jobs
    .filter(j => j.title && j.url)
    .map(j => ({ title: j.title, location: j.location || null, job_url: j.url, description: j.description || null }))
}

async function fetchPostingsFor(careersUrl: string): Promise<Posting[]> {
  let url: URL
  try {
    url = new URL(careersUrl)
  } catch {
    throw new Error('Invalid careers URL')
  }
  const host = url.hostname

  const greenhouse = host.match(/^(boards|job-boards)\.greenhouse\.io$/) ? url.pathname.split('/').filter(Boolean)[0] : null
  if (greenhouse) return fetchGreenhouse(greenhouse)

  const lever = host === 'jobs.lever.co' ? url.pathname.split('/').filter(Boolean)[0] : null
  if (lever) return fetchLever(lever)

  const ashby = host === 'jobs.ashbyhq.com' ? url.pathname.split('/').filter(Boolean)[0] : null
  if (ashby) return fetchAshby(ashby)

  const workdayMatch = host.match(/^([\w-]+)\.(wd\d+\.myworkdayjobs\.com)$/)
  if (workdayMatch) {
    const [, tenant, wdHost] = workdayMatch
    const site = url.pathname.split('/').filter(Boolean)[1] || url.pathname.split('/').filter(Boolean)[0]
    if (site) return fetchWorkday(tenant, wdHost, site)
  }

  return fetchViaAi(careersUrl)
}

type MatchCandidate = { index: number; title: string; company: string; location: string | null; description: string | null }
type MatchResult = { index: number; score: number; reason: string }

async function scoreBatch(resumeText: string, candidates: MatchCandidate[]): Promise<MatchResult[]> {
  const list = candidates
    .map(c => `[${c.index}] ${c.title} at ${c.company}${c.location ? ` (${c.location})` : ''}${c.description ? `\n${c.description.slice(0, 1500)}` : ''}`)
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [
      {
        name: 'score_job_matches',
        description: 'Score how well each job posting matches the candidate resume',
        input_schema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number' },
                  score: { type: 'number', description: '0-100 fit score against the resume' },
                  reason: { type: 'string', description: 'One short sentence explaining the score' },
                },
                required: ['index', 'score', 'reason'],
              },
            },
          },
          required: ['results'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'score_job_matches' },
    messages: [
      {
        role: 'user',
        content: `Candidate resume:\n${resumeText.slice(0, 8000)}\n\nJob postings:\n${list}\n\nFor each posting, score 0-100 how well it fits this candidate's background and experience level using the score_job_matches tool. Be discriminating — a generic title match without relevant experience should score low.`,
      },
    ],
  })

  const toolUseBlock = response.content.find(b => b.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') return []
  const extracted = toolUseBlock.input as { results: MatchResult[] }
  return Array.isArray(extracted?.results) ? extracted.results : []
}

async function scoreAll(resumeText: string, candidates: MatchCandidate[]): Promise<Map<number, MatchResult>> {
  const results = new Map<number, MatchResult>()
  const chunkSize = 15
  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize)
    try {
      const scored = await scoreBatch(resumeText, chunk)
      for (const r of scored) results.set(r.index, r)
    } catch {
      // Leave this chunk unscored rather than failing the whole refresh
    }
  }
  return results
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, careers_url')
      .not('careers_url', 'is', null)

    const activeCompanies = (companies || []).filter((c: Company) => c.careers_url?.trim()) as Company[]

    const [{ data: existingJobs }, { data: existingFinds }] = await Promise.all([
      supabase.from('jobs').select('job_url'),
      supabase.from('job_finds').select('job_url'),
    ])
    const seenUrls = new Set<string>([
      ...(existingJobs || []).map((j: { job_url: string }) => j.job_url).filter(Boolean),
      ...(existingFinds || []).map((f: { job_url: string }) => f.job_url).filter(Boolean),
    ])

    const { data: resumeRow } = await supabase
      .from('resume_profile')
      .select('resume_text')
      .eq('user_id', user.id)
      .maybeSingle()
    const resumeText = resumeRow?.resume_text || null

    const errors: { company_name: string; message: string }[] = []
    const found: { company: Company; posting: Posting }[] = []

    for (const company of activeCompanies) {
      try {
        const postings = await fetchPostingsFor(company.careers_url)
        for (const posting of postings) {
          if (!posting.job_url || seenUrls.has(posting.job_url)) continue
          seenUrls.add(posting.job_url)
          found.push({ company, posting })
        }
      } catch (err) {
        errors.push({ company_name: company.name, message: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    let scores = new Map<number, MatchResult>()
    if (resumeText && found.length > 0) {
      const candidates: MatchCandidate[] = found.map((f, index) => ({
        index,
        title: f.posting.title,
        company: f.company.name,
        location: f.posting.location,
        description: f.posting.description || null,
      }))
      scores = await scoreAll(resumeText, candidates)
    }

    const rowsToInsert: ScoredRow[] = found.map((f, index) => {
      const scored = scores.get(index)
      return {
        user_id: user.id,
        company_id: f.company.id,
        title: f.posting.title,
        location: f.posting.location,
        job_url: f.posting.job_url,
        match_score: scored ? Math.round(scored.score) : null,
        match_reason: scored ? scored.reason : null,
      }
    })

    let newFinds = 0
    if (rowsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('job_finds')
        .upsert(rowsToInsert, { onConflict: 'user_id,job_url', ignoreDuplicates: true })
        .select('id')
      if (insertError) throw insertError
      newFinds = inserted?.length || 0
    }

    return new Response(
      JSON.stringify({ checked_companies: activeCompanies.length, new_finds: newFinds, scored: !!resumeText, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unexpected error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
