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
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
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

    const userPrompt = `This is a handwritten site visit note for a curtain tailor. Extract all rooms and their associated products/items using the extract_bill_data tool.

Known products catalogue:
${productList || '(none)'}

Rules:
- For each item, if the product name closely matches a catalogue entry (case-insensitive, partial match is fine), use the catalogue entry's unit and price and set matched: true
- If no catalogue match, extract the unit and price directly from the image and set matched: false
- If quantity, unit, or price is not visible or unclear, use 0 for numbers and empty string for unit
- If no rooms or items can be found, call the tool with an empty rooms array`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [
        {
          name: 'extract_bill_data',
          description: 'Extract rooms and line items from a handwritten curtain tailor site visit note',
          input_schema: {
            type: 'object',
            properties: {
              rooms: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Room name, e.g. "Living Room"' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          product_name: { type: 'string' },
                          quantity: { type: 'number' },
                          unit: { type: 'string', description: 'e.g. sqft, mts, piece, on ft' },
                          price: { type: 'number' },
                          matched: { type: 'boolean', description: 'true if matched to catalogue' },
                        },
                        required: ['product_name', 'quantity', 'unit', 'price', 'matched'],
                      },
                    },
                  },
                  required: ['name', 'items'],
                },
              },
            },
            required: ['rooms'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'extract_bill_data' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: media_type as AllowedMediaType,
                data: image_base64,
              },
            },
            { type: 'text', text: userPrompt },
          ],
        },
      ],
    })

    const toolUseBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      return new Response(
        JSON.stringify({ error: "Couldn't extract data from this image — please try again" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const extracted = toolUseBlock.input as { rooms: unknown[] }
    if (!Array.isArray(extracted?.rooms)) {
      return new Response(
        JSON.stringify({ error: "Couldn't extract data from this image — please try again" }),
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
