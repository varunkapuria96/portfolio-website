import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

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
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: media_type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: image_base64,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    let extracted: { rooms: unknown[] }
    try {
      extracted = JSON.parse(text)
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
