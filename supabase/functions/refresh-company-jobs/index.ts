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

type Posting = { title: string; location: string | null; job_url: string }
type Company = { id: string; name: string; careers_url: string }

function absoluteUrl(base: string, path: string): string {
  try {
    return new URL(path, base).toString()
  } catch {
    return path
  }
}

async function fetchGreenhouse(slug: string): Promise<Posting[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`)
  if (!res.ok) throw new Error(`Greenhouse API returned ${res.status}`)
  const data = await res.json()
  return (data.jobs || []).map((j: { title: string; absolute_url: string; location?: { name?: string } }) => ({
    title: j.title,
    location: j.location?.name || null,
    job_url: j.absolute_url,
  }))
}

async function fetchLever(slug: string): Promise<Posting[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`)
  if (!res.ok) throw new Error(`Lever API returned ${res.status}`)
  const data = await res.json()
  return (data || []).map((j: { text: string; hostedUrl: string; categories?: { location?: string } }) => ({
    title: j.text,
    location: j.categories?.location || null,
    job_url: j.hostedUrl,
  }))
}

async function fetchAshby(slug: string): Promise<Posting[]> {
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)
  if (!res.ok) throw new Error(`Ashby API returned ${res.status}`)
  const data = await res.json()
  return (data.jobs || []).map((j: { title: string; jobUrl: string; location?: string }) => ({
    title: j.title,
    location: j.location || null,
    job_url: j.jobUrl,
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
                },
                required: ['title', 'location', 'url'],
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
  const extracted = toolUseBlock.input as { jobs: { title: string; location: string; url: string }[] }
  if (!Array.isArray(extracted?.jobs)) return []
  return extracted.jobs
    .filter(j => j.title && j.url)
    .map(j => ({ title: j.title, location: j.location || null, job_url: j.url }))
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

    const errors: { company_name: string; message: string }[] = []
    const rowsToInsert: { user_id: string; company_id: string; title: string; location: string | null; job_url: string }[] = []

    for (const company of activeCompanies) {
      try {
        const postings = await fetchPostingsFor(company.careers_url)
        for (const posting of postings) {
          if (!posting.job_url || seenUrls.has(posting.job_url)) continue
          seenUrls.add(posting.job_url)
          rowsToInsert.push({
            user_id: user.id,
            company_id: company.id,
            title: posting.title,
            location: posting.location,
            job_url: posting.job_url,
          })
        }
      } catch (err) {
        errors.push({ company_name: company.name, message: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

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
      JSON.stringify({ checked_companies: activeCompanies.length, new_finds: newFinds, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unexpected error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
