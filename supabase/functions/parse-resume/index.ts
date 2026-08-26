import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required')
}
const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdf_base64 } = await req.json()

    if (!pdf_base64) {
      return new Response(
        JSON.stringify({ error: 'Missing pdf_base64' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [
        {
          name: 'extract_resume_text',
          description: 'Extract the full plain-text content of a resume, enough to judge job fit against',
          input_schema: {
            type: 'object',
            properties: {
              resume_text: {
                type: 'string',
                description: 'Plain text of the resume: summary, roles, bullet points, education, and skills',
              },
            },
            required: ['resume_text'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'extract_resume_text' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 },
            },
            { type: 'text', text: 'Extract the full plain-text content of this resume using the extract_resume_text tool.' },
          ],
        },
      ],
    })

    const toolUseBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      return new Response(
        JSON.stringify({ error: "Couldn't read this resume — please try again" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const extracted = toolUseBlock.input as { resume_text: string }
    if (!extracted?.resume_text) {
      return new Response(
        JSON.stringify({ error: "Couldn't read this resume — please try again" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ resume_text: extracted.resume_text }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unexpected error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
