# Bill Image Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Import from image" button to BillEditor that uploads a photo of a handwritten site visit note, sends it to a Supabase Edge Function calling Claude Vision, and shows an editable review modal before writing rooms and items to the bill.

**Architecture:** A Supabase Edge Function (`extract-bill-image`) receives the image as base64 plus the user's product catalogue, calls the Claude API (claude-sonnet-4-6 with vision), and returns structured JSON. A new `BillImportModal` component handles loading/review/error states. BillEditor grows an `addImportedRooms` function that bulk-inserts the confirmed rooms and items.

**Tech Stack:** React 19, Supabase JS client (`supabase.functions.invoke`), Supabase Edge Functions (Deno), `@anthropic-ai/sdk` (npm import in Deno), Vitest + @testing-library/react

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/functions/extract-bill-image/index.ts` | Edge Function — receives image + catalogue, calls Claude, returns `{ rooms }` |
| Create | `src/components/BillImportModal.jsx` | Modal — loading, review (editable), error states |
| Create | `src/components/BillImportModal.test.jsx` | Tests for all modal states |
| Modify | `src/components/BillEditor.jsx` | Import button, file input ref, modal state, `addImportedRooms` |
| Modify | `src/components/BillEditor.test.jsx` | Add test for import button presence |
| Modify | `src/index.css` | Modal overlay, room/item grid, unmatched highlight styles |

---

## Task 1: Supabase Edge Function

**Files:**
- Create: `supabase/functions/extract-bill-image/index.ts`

The edge function always returns HTTP 200. Success: `{ rooms: [...] }`. Failure: `{ error: "message" }`. This avoids complex `FunctionsHttpError` parsing on the client.

- [ ] **Step 1.1: Create the directory and file**

```bash
mkdir -p supabase/functions/extract-bill-image
```

Create `supabase/functions/extract-bill-image/index.ts`:

```typescript
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
```

- [ ] **Step 1.2: Set the Anthropic API key secret in Supabase**

In the Supabase dashboard → Project Settings → Edge Functions → Secrets, add:
- Name: `ANTHROPIC_API_KEY`
- Value: your Anthropic API key from https://console.anthropic.com

*(Cannot be scripted — requires dashboard access.)*

- [ ] **Step 1.3: Deploy the Edge Function**

```bash
npx supabase functions deploy extract-bill-image --project-ref qczvsvkyiplqmvhftcdc
```

Expected output ends with: `Deployed Function extract-bill-image`

- [ ] **Step 1.4: Smoke-test the deployed function**

You need your Supabase anon key (already in `.env.local`) for this curl:

```bash
curl -s -X POST \
  "https://qczvsvkyiplqmvhftcdc.supabase.co/functions/v1/extract-bill-image" \
  -H "Authorization: Bearer $(grep VITE_SUPABASE_ANON_KEY .env.local | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"image_base64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","media_type":"image/png","products":[]}' | python3 -m json.tool
```

Expected: `{ "rooms": [] }` (1×1 pixel PNG has no text — an empty result is correct and confirms the function is live)

- [ ] **Step 1.5: Commit**

```bash
git add supabase/functions/extract-bill-image/index.ts
git commit -m "feat: add extract-bill-image Supabase Edge Function"
```

---

## Task 2: BillImportModal component (TDD)

**Files:**
- Create: `src/components/BillImportModal.test.jsx`
- Create: `src/components/BillImportModal.jsx`

- [ ] **Step 2.1: Write the failing tests**

Create `src/components/BillImportModal.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import BillImportModal from './BillImportModal'

const sampleRooms = [
  {
    name: 'Living Room',
    items: [
      { product_name: 'Roman Blind', quantity: 3, unit: 'sqft', price: 850, matched: true },
      { product_name: 'blackout lining', quantity: 2, unit: '', price: 0, matched: false },
    ],
  },
]

describe('BillImportModal', () => {
  it('shows spinner and disabled Add button in loading state', () => {
    render(
      <BillImportModal
        status="loading"
        extractedRooms={[]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByText('Reading your note…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to bill/i })).toBeDisabled()
  })

  it('shows error message and retry button in error state', async () => {
    const onRetry = vi.fn()
    render(
      <BillImportModal
        status="error"
        extractedRooms={[]}
        errorMessage="Couldn't read this image — try a clearer photo"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={onRetry}
      />
    )
    expect(screen.getByText("Couldn't read this image — try a clearer photo")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('renders room name and item names in review state', () => {
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('Living Room')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Roman Blind')).toBeInTheDocument()
    expect(screen.getByDisplayValue('blackout lining')).toBeInTheDocument()
  })

  it('applies unmatched class to items with matched: false', () => {
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('blackout lining')).toHaveClass('unmatched')
    expect(screen.getByDisplayValue('Roman Blind')).not.toHaveClass('unmatched')
  })

  it('calls onConfirm with current rooms when Add to Bill is clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /add to bill/i }))
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Living Room' }),
      ])
    )
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        onConfirm={vi.fn()}
        onClose={onClose}
        onRetry={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows no-rooms message when review has empty rooms array', () => {
    render(
      <BillImportModal
        status="review"
        extractedRooms={[]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByText(/no rooms found/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2.2: Run tests — confirm they fail**

```bash
npm test -- BillImportModal
```

Expected: all 6 tests FAIL with `Cannot find module './BillImportModal'`

- [ ] **Step 2.3: Implement BillImportModal**

Create `src/components/BillImportModal.jsx`:

```jsx
import { useState, useEffect } from 'react'

export default function BillImportModal({ status, extractedRooms, errorMessage, onConfirm, onClose, onRetry }) {
  const [rooms, setRooms] = useState(extractedRooms || [])

  useEffect(() => {
    setRooms(extractedRooms || [])
  }, [extractedRooms])

  function updateRoomName(roomIdx, value) {
    setRooms(prev => prev.map((r, i) => i === roomIdx ? { ...r, name: value } : r))
  }

  function removeRoom(roomIdx) {
    setRooms(prev => prev.filter((_, i) => i !== roomIdx))
  }

  function updateItem(roomIdx, itemIdx, field, value) {
    setRooms(prev => prev.map((r, i) =>
      i === roomIdx
        ? { ...r, items: r.items.map((item, j) => j === itemIdx ? { ...item, [field]: value } : item) }
        : r
    ))
  }

  function removeItem(roomIdx, itemIdx) {
    setRooms(prev => prev.map((r, i) =>
      i === roomIdx ? { ...r, items: r.items.filter((_, j) => j !== itemIdx) } : r
    ))
  }

  function addItem(roomIdx) {
    setRooms(prev => prev.map((r, i) =>
      i === roomIdx
        ? { ...r, items: [...r.items, { product_name: '', quantity: 0, unit: '', price: 0, matched: true }] }
        : r
    ))
  }

  return (
    <div className="import-modal-backdrop" onClick={onClose}>
      <div className="import-modal" onClick={e => e.stopPropagation()}>
        <div className="import-modal-header">
          <span>Import from image</span>
          <button className="import-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="import-modal-body">
          {status === 'loading' && (
            <div className="import-loading">
              <div className="import-spinner" />
              <div>Reading your note…</div>
              <div className="import-loading-sub">This takes a few seconds</div>
            </div>
          )}

          {status === 'error' && (
            <div className="import-error">
              <div>{errorMessage || "Couldn't read this image — try a clearer photo"}</div>
              <button className="import-retry-btn" onClick={onRetry}>Retry</button>
            </div>
          )}

          {status === 'review' && (
            rooms.length === 0 ? (
              <div className="import-no-rooms">No rooms found — try a clearer photo</div>
            ) : (
              <>
                <p className="import-hint">
                  Review and edit before adding to bill. Highlighted items weren't matched to your catalogue.
                </p>
                {rooms.map((room, roomIdx) => (
                  <div key={roomIdx} className="import-room">
                    <div className="import-room-header">
                      <input
                        className="import-room-name"
                        value={room.name}
                        onChange={e => updateRoomName(roomIdx, e.target.value)}
                        aria-label="Room name"
                      />
                      <button className="import-remove-room" onClick={() => removeRoom(roomIdx)}>
                        Remove room
                      </button>
                    </div>
                    <div className="import-item-grid">
                      <span className="import-col-header">Product</span>
                      <span className="import-col-header">Qty</span>
                      <span className="import-col-header">Unit</span>
                      <span className="import-col-header">Rate</span>
                      <span />
                      {room.items.map((item, itemIdx) => (
                        <React.Fragment key={itemIdx}>
                          <div>
                            <input
                              className={`import-item-input${item.matched === false ? ' unmatched' : ''}`}
                              value={item.product_name}
                              onChange={e => updateItem(roomIdx, itemIdx, 'product_name', e.target.value)}
                              aria-label="Product name"
                            />
                            {item.matched === false && (
                              <div className="import-unmatched-hint">⚠ Not in catalogue — edit or remove</div>
                            )}
                          </div>
                          <input
                            className="import-item-input"
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItem(roomIdx, itemIdx, 'quantity', parseFloat(e.target.value) || 0)}
                            aria-label="Quantity"
                          />
                          <input
                            className="import-item-input"
                            value={item.unit}
                            onChange={e => updateItem(roomIdx, itemIdx, 'unit', e.target.value)}
                            aria-label="Unit"
                          />
                          <input
                            className="import-item-input"
                            type="number"
                            value={item.price}
                            onChange={e => updateItem(roomIdx, itemIdx, 'price', parseFloat(e.target.value) || 0)}
                            aria-label="Rate"
                          />
                          <button
                            className="import-remove-item"
                            onClick={() => removeItem(roomIdx, itemIdx)}
                            aria-label="Remove item"
                          >×</button>
                        </React.Fragment>
                      ))}
                    </div>
                    <button className="import-add-item" onClick={() => addItem(roomIdx)}>+ Add item</button>
                  </div>
                ))}
              </>
            )
          )}
        </div>

        <div className="import-modal-footer">
          <button className="import-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="import-add-btn"
            onClick={() => onConfirm(rooms)}
            disabled={status !== 'review'}
          >
            Add to Bill
          </button>
        </div>
      </div>
    </div>
  )
}
```

Add `import React from 'react'` at the top of the file (needed for `React.Fragment`).

Full file with import:

```jsx
import React, { useState, useEffect } from 'react'

export default function BillImportModal({ status, extractedRooms, errorMessage, onConfirm, onClose, onRetry }) {
  // ... (same as above)
}
```

- [ ] **Step 2.4: Run tests — confirm they pass**

```bash
npm test -- BillImportModal
```

Expected: 6 tests PASS

- [ ] **Step 2.5: Commit**

```bash
git add src/components/BillImportModal.jsx src/components/BillImportModal.test.jsx
git commit -m "feat: add BillImportModal component with loading, review, and error states"
```

---

## Task 3: CSS styles for the import modal

**Files:**
- Modify: `src/index.css`

- [ ] **Step 3.1: Append modal styles to index.css**

Find the end of the bills section in `src/index.css` (after the last `.bill-*` rule, before `@media print`). Add the following block:

```css
/* ── Bill Import Modal ─────────────────────────────────── */

.import-modal-backdrop {
  align-items: center;
  background: rgba(0, 0, 0, 0.75);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 200;
}

.import-modal {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  max-width: 660px;
  overflow: hidden;
  width: 100%;
}

.import-modal-header {
  align-items: center;
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  font-size: 14px;
  font-weight: 600;
  justify-content: space-between;
  padding: 14px 20px;
}

.import-modal-close {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
}

.import-modal-close:hover { color: #e0e0e0; }

.import-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.import-modal-footer {
  align-items: center;
  background: #1a1a1a;
  border-top: 1px solid #2a2a2a;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 20px;
}

.import-cancel-btn {
  background: transparent;
  border: 1px solid #333;
  border-radius: 4px;
  color: #888;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  padding: 7px 16px;
}

.import-add-btn {
  background: #00ff88;
  border: none;
  border-radius: 4px;
  color: #000;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 7px 18px;
}

.import-add-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.import-loading {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
  justify-content: center;
  font-size: 14px;
  color: #888;
}

.import-loading-sub { color: #444; font-size: 12px; }

.import-spinner {
  animation: spin 0.8s linear infinite;
  border: 2px solid #2a2a2a;
  border-radius: 50%;
  border-top-color: #00ff88;
  height: 22px;
  width: 22px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.import-error {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 13px;
  color: #ff6b6b;
  min-height: 100px;
  justify-content: center;
  text-align: center;
}

.import-retry-btn {
  background: none;
  border: 1px solid #ff6b6b;
  border-radius: 4px;
  color: #ff6b6b;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  padding: 6px 14px;
}

.import-hint {
  color: #555;
  font-size: 12px;
  margin-bottom: 14px;
  margin-top: 0;
}

.import-no-rooms {
  color: #555;
  font-size: 13px;
  padding: 24px 0;
  text-align: center;
}

.import-room { margin-bottom: 20px; }

.import-room-header {
  align-items: center;
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.import-room-name {
  background: #0f0f0f;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #00ff88;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 5px 8px;
  width: 200px;
}

.import-remove-room {
  background: none;
  border: none;
  color: #444;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  margin-left: auto;
  padding: 0;
}

.import-remove-room:hover { color: #ff4444; }

.import-item-grid {
  display: grid;
  grid-template-columns: 2fr 72px 72px 80px 24px;
  gap: 5px;
  align-items: start;
}

.import-col-header {
  color: #444;
  font-size: 10px;
  padding: 0 3px;
  text-transform: uppercase;
}

.import-item-input {
  background: #0f0f0f;
  border: 1px solid #2a2a2a;
  border-radius: 3px;
  color: #e0e0e0;
  font-family: inherit;
  font-size: 12px;
  padding: 5px 6px;
  width: 100%;
  box-sizing: border-box;
}

.import-item-input.unmatched { border-color: #664400; color: #ffaa44; }

.import-unmatched-hint {
  color: #ffaa44;
  font-size: 10px;
  margin-top: 2px;
  padding: 0 3px;
}

.import-remove-item {
  background: none;
  border: none;
  color: #444;
  cursor: pointer;
  font-size: 16px;
  padding: 3px 0;
  text-align: center;
}

.import-remove-item:hover { color: #ff4444; }

.import-add-item {
  background: none;
  border: none;
  color: #00ff88;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  margin-top: 6px;
  padding: 0;
}

.import-btn {
  background: none;
  border: 1px solid #00ff88;
  border-radius: 3px;
  color: #00ff88;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  padding: 5px 14px;
}

.import-file-error {
  color: #ff6b6b;
  font-size: 11px;
  margin-top: 4px;
}
```

- [ ] **Step 3.2: Run the full test suite to confirm nothing broke**

```bash
npm test
```

Expected: all existing tests PASS

- [ ] **Step 3.3: Commit**

```bash
git add src/index.css
git commit -m "feat: add CSS styles for bill import modal"
```

---

## Task 4: BillEditor integration

**Files:**
- Modify: `src/components/BillEditor.jsx`
- Modify: `src/components/BillEditor.test.jsx`

- [ ] **Step 4.1: Add the failing test for the import button**

In `src/components/BillEditor.test.jsx`, add one test inside the existing `describe('BillEditor', ...)` block:

```jsx
it('renders Import from image button in nav', async () => {
  render(<BillEditor session={mockSession} billId="b1" onBack={vi.fn()} />)
  await screen.findByDisplayValue('Tanay Mehta')
  expect(screen.getByRole('button', { name: /import from image/i })).toBeInTheDocument()
})
```

- [ ] **Step 4.2: Run the new test — confirm it fails**

```bash
npm test -- BillEditor
```

Expected: 4 existing tests PASS, 1 new test FAIL (`Unable to find an accessible element with the role "button" and name /import from image/i`)

- [ ] **Step 4.3: Integrate import button and modal into BillEditor**

Replace the contents of `src/components/BillEditor.jsx` with the following (all existing functionality preserved, new import feature added):

```jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import BillPrint from './BillPrint'
import BillImportModal from './BillImportModal'

function fmt(n) {
  return (n || 0).toLocaleString('en-IN')
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result.split(',')[1])
    reader.readAsDataURL(file)
  })
}

export default function BillEditor({ session, billId, onBack }) {
  const [bill, setBill] = useState(null)
  const [rooms, setRooms] = useState([])
  const [availableRooms, setAvailableRooms] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [company, setCompany] = useState(null)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importStatus, setImportStatus] = useState('loading')
  const [importExtracted, setImportExtracted] = useState([])
  const [importError, setImportError] = useState('')
  const [importFileError, setImportFileError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function load() {
      const [{ data: billData }, { data: roomsData }, { data: avRooms }, { data: avProducts }, { data: companyData }] =
        await Promise.all([
          supabase.from('bills').select('*').eq('id', billId).single(),
          supabase.from('bill_rooms').select('*, bill_items(*)').eq('bill_id', billId).order('sort_order'),
          supabase.from('rooms').select('*').order('created_at', { ascending: true }),
          supabase.from('products').select('*').order('created_at', { ascending: true }),
          supabase.from('company_info').select('*').eq('user_id', session.user.id).maybeSingle(),
        ])
      if (billData) setBill(billData)
      if (roomsData) setRooms(roomsData.map(({ bill_items, ...r }) => ({ ...r, items: bill_items || [] })))
      if (avRooms) setAvailableRooms(avRooms)
      if (avProducts) setAvailableProducts(avProducts)
      setCompany(companyData || { header: '', subheader: '' })
    }
    load()
  }, [billId])

  const roomsSubtotal = rooms.reduce(
    (sum, room) => sum + room.items.reduce((s, item) => s + (item.total || 0), 0),
    0
  )
  const grandTotal = roomsSubtotal + (bill?.cartage || 0) + (bill?.labor_charges || 0)
  const balanceDue = grandTotal - (bill?.advance_payment || 0)

  async function saveBillField(field, value) {
    await supabase.from('bills').update({ [field]: value }).eq('id', billId)
    setBill(prev => ({ ...prev, [field]: value }))
  }

  function updateItemLocally(billRoomId, itemId, updates) {
    setRooms(prev => prev.map(r =>
      r.id === billRoomId
        ? { ...r, items: r.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
        : r
    ))
  }

  async function addRoom(roomId) {
    if (!roomId) return
    const room = availableRooms.find(r => r.id === roomId)
    if (!room) return
    const { data } = await supabase
      .from('bill_rooms')
      .insert({ bill_id: billId, room_id: roomId, room_name: room.name, sort_order: rooms.length })
      .select()
      .single()
    if (data) setRooms(prev => [...prev, { ...data, items: [] }])
  }

  async function deleteRoom(billRoomId) {
    if (!window.confirm('Remove this room from the bill?')) return
    await supabase.from('bill_rooms').delete().eq('id', billRoomId)
    setRooms(prev => prev.filter(r => r.id !== billRoomId))
  }

  async function addItem(billRoomId) {
    const { data } = await supabase
      .from('bill_items')
      .insert({ bill_room_id: billRoomId, product_name: '', unit: '', quantity: 0, price: 0, total: 0 })
      .select()
      .single()
    if (data) {
      setRooms(prev => prev.map(r =>
        r.id === billRoomId ? { ...r, items: [...r.items, data] } : r
      ))
    }
  }

  async function deleteItem(billRoomId, itemId) {
    await supabase.from('bill_items').delete().eq('id', itemId)
    setRooms(prev => prev.map(r =>
      r.id === billRoomId ? { ...r, items: r.items.filter(i => i.id !== itemId) } : r
    ))
  }

  async function selectProduct(billRoomId, itemId, productId) {
    const product = availableProducts.find(p => p.id === productId)
    if (!product) return
    const room = rooms.find(r => r.id === billRoomId)
    const item = room?.items.find(i => i.id === itemId)
    const quantity = item?.quantity || 0
    const total = quantity * product.price

    await supabase.from('bill_items').update({
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      price: product.price,
      total,
    }).eq('id', itemId)

    updateItemLocally(billRoomId, itemId, {
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      price: product.price,
      total,
    })
  }

  async function handleImageFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      setImportFileError('Image must be under 5MB')
      return
    }
    setImportFileError('')
    setImportModalOpen(true)
    setImportStatus('loading')
    setImportError('')
    setImportExtracted([])

    const base64 = await fileToBase64(file)
    const { data, error } = await supabase.functions.invoke('extract-bill-image', {
      body: {
        image_base64: base64,
        media_type: file.type,
        products: availableProducts.map(p => ({ name: p.name, unit: p.unit, price: p.price })),
      },
    })

    if (error || data?.error || !Array.isArray(data?.rooms)) {
      setImportStatus('error')
      setImportError(data?.error || 'Failed to process image')
      return
    }

    setImportExtracted(data.rooms)
    setImportStatus('review')
  }

  async function addImportedRooms(extractedRooms) {
    for (const extracted of extractedRooms) {
      const matchedRoom = availableRooms.find(
        r => r.name.toLowerCase() === extracted.name.toLowerCase()
      )
      const { data: billRoom } = await supabase
        .from('bill_rooms')
        .insert({
          bill_id: billId,
          room_id: matchedRoom?.id || null,
          room_name: extracted.name,
          sort_order: rooms.length,
        })
        .select()
        .single()

      if (!billRoom) continue

      const items = []
      for (const item of extracted.items) {
        const { data: billItem } = await supabase
          .from('bill_items')
          .insert({
            bill_room_id: billRoom.id,
            product_name: item.product_name,
            unit: item.unit,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          })
          .select()
          .single()
        if (billItem) items.push(billItem)
      }

      setRooms(prev => [...prev, { ...billRoom, items }])
    }
    setImportModalOpen(false)
  }

  if (!bill) return null

  return (
    <>
      <div className="bill-editor">
        <div className="bill-editor-nav">
          <button className="back-btn" onClick={onBack}>← Bills</button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div>
              <button
                className="import-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Import from image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); e.target.value = '' }}
              />
              {importFileError && <div className="import-file-error">{importFileError}</div>}
            </div>
            <button className="print-btn" onClick={() => window.print()}>Print / Save PDF</button>
          </div>
        </div>

        <div className="bill-header-fields">
          <input
            className="bill-customer-input"
            placeholder="Customer Name"
            defaultValue={bill.customer_name}
            onBlur={e => saveBillField('customer_name', e.target.value)}
          />
          <input
            type="date"
            className="bill-date-input"
            defaultValue={bill.date}
            onBlur={e => saveBillField('date', e.target.value)}
          />
        </div>

        {rooms.map(room => (
          <div key={room.id} className="bill-room">
            <div className="bill-room-header">
              <span className="bill-room-name">{room.room_name}</span>
              <button className="room-delete-btn" onClick={() => deleteRoom(room.id)}>
                Remove room
              </button>
            </div>

            <table className="bill-items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {room.items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <select
                        value={item.product_id || ''}
                        onChange={e => selectProduct(room.id, item.id, e.target.value)}
                      >
                        <option value="">Select product</option>
                        {availableProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => {
                          const qty = parseFloat(e.target.value) || 0
                          updateItemLocally(room.id, item.id, { quantity: qty, total: qty * item.price })
                        }}
                        onBlur={async e => {
                          const qty = parseFloat(e.target.value) || 0
                          const total = qty * item.price
                          await supabase.from('bill_items').update({ quantity: qty, total }).eq('id', item.id)
                        }}
                      />
                    </td>
                    <td><span className="item-unit">{item.unit || '—'}</span></td>
                    <td>
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => {
                          const rate = parseFloat(e.target.value) || 0
                          updateItemLocally(room.id, item.id, { price: rate, total: item.quantity * rate })
                        }}
                        onBlur={async e => {
                          const rate = parseFloat(e.target.value) || 0
                          const total = item.quantity * rate
                          await supabase.from('bill_items').update({ price: rate, total }).eq('id', item.id)
                        }}
                      />
                    </td>
                    <td className="item-total">₹{fmt(item.total)}</td>
                    <td>
                      <button
                        className="item-delete-btn"
                        onClick={() => deleteItem(room.id, item.id)}
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="room-footer">
              <button className="add-item-btn" onClick={() => addItem(room.id)}>+ Add Item</button>
              <span className="room-subtotal">
                Room: ₹{fmt(room.items.reduce((s, i) => s + (i.total || 0), 0))}
              </span>
            </div>
          </div>
        ))}

        <div className="add-room-section">
          <select
            className="add-room-select"
            value=""
            onChange={e => { addRoom(e.target.value); e.target.value = '' }}
          >
            <option value="">+ Add Room</option>
            {availableRooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="grand-total-section">
          <div className="total-row">
            <span>Rooms Subtotal</span>
            <span>₹{fmt(roomsSubtotal)}</span>
          </div>
          <div className="total-row">
            <span>+ Cartage</span>
            <input
              type="number"
              defaultValue={bill.cartage}
              onBlur={e => saveBillField('cartage', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="total-row">
            <span>+ Labour Charges</span>
            <input
              type="number"
              defaultValue={bill.labor_charges}
              onBlur={e => saveBillField('labor_charges', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="total-row grand-total">
            <span>Grand Total</span>
            <span>₹{fmt(grandTotal)}</span>
          </div>
          <div className="total-row">
            <span>− Advance Paid</span>
            <input
              type="number"
              defaultValue={bill.advance_payment}
              onBlur={e => saveBillField('advance_payment', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="total-row balance-due">
            <span>Balance Due</span>
            <span>₹{fmt(balanceDue)}</span>
          </div>
        </div>
      </div>

      <BillPrint
        bill={bill}
        rooms={rooms}
        roomsSubtotal={roomsSubtotal}
        grandTotal={grandTotal}
        balanceDue={balanceDue}
        company={company}
      />

      {importModalOpen && (
        <BillImportModal
          status={importStatus}
          extractedRooms={importExtracted}
          errorMessage={importError}
          onConfirm={addImportedRooms}
          onClose={() => setImportModalOpen(false)}
          onRetry={() => fileInputRef.current?.click()}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4.4: Run all tests — confirm they pass**

```bash
npm test
```

Expected: all tests PASS (including the new import button test)

- [ ] **Step 4.5: Commit**

```bash
git add src/components/BillEditor.jsx src/components/BillEditor.test.jsx
git commit -m "feat: integrate image import into BillEditor with review modal"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Edge Function with Anthropic API key as secret — Task 1
- ✅ Import button in nav bar (top-right, next to Print) — Task 4
- ✅ File size check >5MB rejected client-side — Task 4 (`handleImageFile`)
- ✅ Loading state with spinner — Task 2
- ✅ Review state with editable rooms/items — Task 2
- ✅ Unmatched items highlighted in orange — Task 2 + Task 3 (`.unmatched` class)
- ✅ Error state with retry — Task 2
- ✅ Empty extraction ("no rooms found") — Task 2
- ✅ "Add to Bill" bulk-inserts to `bill_rooms` + `bill_items` — Task 4 (`addImportedRooms`)
- ✅ Room name matched to catalogue (case-insensitive) for `room_id` — Task 4
- ✅ CSS styles — Task 3

**Type consistency:** `extractedRooms` prop shape `{ name, items: [{ product_name, quantity, unit, price, matched }] }` is consistent across Edge Function response, BillImportModal props, and `addImportedRooms` consumer.
