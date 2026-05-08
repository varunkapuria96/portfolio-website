# Bill Image Import — Design Spec
**Date:** 2026-05-07
**Project:** portfolio-website (bills app)

---

## Overview

Add an "Import from image" feature to the BillEditor. The user uploads a photo of a handwritten site visit note; a Supabase Edge Function calls the Claude Vision API to extract rooms and items from the image; a review modal lets the user edit the extracted data before it is committed to the bill.

---

## Architecture

### New component
- `src/components/BillImportModal.jsx` — modal for the loading and review states

### Modified files
- `src/components/BillEditor.jsx` — "Import from image" button in the nav bar, file input, state wiring to open/close the modal
- `src/index.css` — modal styles

### New Supabase Edge Function
- `supabase/functions/extract-bill-image/index.ts`
- Called via POST from the client with the image and product catalogue
- Calls the Claude API (claude-sonnet-4-6 with vision) and returns structured JSON
- The Anthropic API key is stored as a Supabase Edge Function secret (`ANTHROPIC_API_KEY`) — never in the client

---

## Data Flow

1. User clicks **"Import from image"** button in the BillEditor nav bar
2. A hidden `<input type="file" accept="image/*">` is triggered — user selects a photo
3. Client reads the file, rejects if >5MB with an inline error message
4. Image is base64-encoded in the browser
5. Client POSTs to `/functions/v1/extract-bill-image`:
   ```json
   {
     "image_base64": "...",
     "media_type": "image/jpeg",
     "products": [
       { "name": "Roman Blind", "unit": "sqft", "price": 850 }
     ]
   }
   ```
6. Edge Function calls Claude Vision API with a prompt (see below) and returns:
   ```json
   {
     "rooms": [
       {
         "name": "Living Room",
         "items": [
           { "product_name": "Roman Blind", "quantity": 3, "unit": "sqft", "price": 850, "matched": true },
           { "product_name": "blackout lining", "quantity": 3, "unit": "sqft", "price": 0, "matched": false }
         ]
       }
     ]
   }
   ```
7. Review modal opens — pre-filled editable fields, unmatched items highlighted in orange
8. User edits/removes items, then clicks **"Add to Bill"**
9. Client writes all rooms and items to Supabase using the existing `addRoom` / `addItem` / `selectProduct` logic in BillEditor

---

## Claude Prompt (Edge Function)

The system prompt instructs Claude to:
- Extract all room names and their associated products/items from the image
- For each item, return `product_name`, `quantity` (numeric, default 0 if not found), `unit` (default empty string), and `price` (matched from the provided catalogue, or 0 if unmatched)
- Set `matched: true` if the product name closely matches a catalogue entry, `matched: false` otherwise
- Return only valid JSON matching the schema above — no prose
- If the image contains no recognisable room/product structure, return `{ "rooms": [] }`

The product catalogue is included in the user message so Claude can attempt fuzzy name matching and pre-fill unit and price.

---

## UI — BillEditor changes

**Nav bar:**
```
← Bills                    [Import from image]  [Print / Save PDF]
```

The import button is styled with a green border and green text (matching the existing accent colour), consistent with other secondary actions.

---

## UI — BillImportModal

### State 1 — Processing
- Spinner with "Reading your note…" and a sub-label "This takes a few seconds"
- Cancel button (aborts fetch), disabled "Add to Bill" button

### State 2 — Review
- Instructional line: "Review and edit before adding to bill. Highlighted items weren't matched to your catalogue."
- For each extracted room:
  - Editable room name input (green, styled like the room header)
  - Item grid: Product (text input) | Qty | Unit | Rate | ✕
  - Unmatched items: orange border on the product input, `⚠ Not in catalogue — edit or remove` hint below
  - "+ Add item" link to add a blank row
  - "Remove room" link to drop the whole room
- Footer: **Cancel** | **Add to Bill**

### State 3 — Error
- Message: "Couldn't read this image — try a clearer photo"
- Retry button re-triggers the same image through the edge function
- Cancel button

---

## Error Handling

| Scenario | Handling |
|---|---|
| Image >5MB | Rejected client-side before upload; inline error under the button |
| Edge Function error / timeout | Modal shows error state with retry button |
| Claude returns unparseable JSON | Edge Function returns 422; modal shows error state |
| Claude returns `{ rooms: [] }` | Modal shows "No rooms found — try a clearer photo" with retry |
| Network offline | Fetch rejects; modal shows error state |

---

## Out of Scope
- Editing the image or cropping before upload
- Uploading multiple images at once
- Saving the extracted image for later reference
- Auto-creating new products or rooms in the catalogue from extracted data (user manages catalogue separately)
