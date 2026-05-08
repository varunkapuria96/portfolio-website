import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fix 5 — Validate API key at startup and instantiate client once at module level
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required')
}
const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// Fix 2 — Allowlist for accepted media types
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type AllowedMediaType = typeof ALLOWED_MEDIA_TYPES[number]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image_base64, media_type, products } = await req.json()

    if (!image_base64 || !media_type) {
      return new Response(
        JSON.stringify({ error: 'Missing image_base64 or media_type' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fix 2 — Validate media_type against allowlist
    if (!ALLOWED_MEDIA_TYPES.includes(media_type as AllowedMediaType)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported image type. Please use JPEG, PNG, or WebP.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const productList = (products || [])
      .map((p: { name: string; unit: string; price: number }) => `- ${p.name} (unit: ${p.unit}, price: ${p.price})`)
      .join('\n')

    const prompt = `This is a handwritten site visit note for a curtain tailor. Extract all rooms and their associated products/items.

Known products catalogue:
${productList || '(none)'}

Return ONLY valid JSON in this exact format, no other text:
{
  "rooms": [
    {
      "name": "room name",
      "items": [
        {
          "product_name": "product name",
          "quantity": 0,
          "unit": "unit string",
          "price": 0,
          "matched": true
        }
      ]
    }
  ]
}

Rules:
- For each item, if the product name closely matches a catalogue entry (case-insensitive, partial match is fine), use the catalogue entry's unit and price and set matched: true
- If no catalogue match, set unit to empty string, price to 0, matched: false
- If quantity is not visible or unclear, use 0
- If no rooms or items can be found in the image, return { "rooms": [] }`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096, // Fix 1 — Raised from 1024 to avoid silent truncation on large bills
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: media_type as AllowedMediaType, // Fix 2 — type is now guaranteed by allowlist check
                data: image_base64,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    // Fix 3 — Guard against empty content array
    const firstBlock = response.content[0]
    const text = firstBlock?.type === 'text' ? firstBlock.text.trim() : ''

    let extracted: { rooms: unknown[] }
    try {
      // Fix 4 — Strip markdown code fences before parsing
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      extracted = JSON.parse(cleaned)
    } catch {
      return new Response(
        JSON.stringify({ error: "Couldn't read this image — try a clearer photo" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!Array.isArray(extracted?.rooms)) {
      return new Response(
        JSON.stringify({ error: "Couldn't read this image — try a clearer photo" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ rooms: extracted.rooms }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unexpected error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
