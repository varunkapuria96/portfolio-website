# Multi-Image Bill Import Design

## Goal

Allow users to select multiple images at once when importing a bill, processing each sequentially and merging all extracted rooms into a single review modal.

## Architecture

No changes to the edge function — it already handles one image at a time. All changes are in `BillEditor.jsx` and `BillImportModal.jsx`.

`handleImageFile(file)` in BillEditor is replaced by `handleImageFiles(files: FileList)` which loops through all selected files sequentially, accumulates extracted rooms, tracks progress, and surfaces partial failures as a warning rather than a hard error.

## Component Changes

### BillEditor.jsx

- File input gets `multiple` attribute
- Two new state vars: `importProgress: { current: number, total: number }` to drive the loading message
- `handleImageFiles(files)` loop:
  1. Validate each file size (≤5MB); skip and count failures if over
  2. Encode to base64
  3. Call `extract-bill-image` edge function
  4. On success: append returned rooms to accumulator
  5. On error: increment failed counter, continue to next file
- After all files processed:
  - If zero rooms extracted and at least one failure → error state (same as today)
  - If some rooms extracted but some failed → review state + set `importWarning` with "X of Y images couldn't be read — rooms below are from the others"
  - If all succeeded → review state, no warning
- `importWarning` state (string) passed to `BillImportModal` as `warningMessage` prop

### BillImportModal.jsx

- New `loadingMessage` prop (string) — replaces hardcoded `"Reading your note…"`. BillEditor passes `"Reading image 2 of 3…"` (updating each iteration).
- New `warningMessage` prop (string, optional) — if present, renders a yellow warning banner at the top of the review body, above the hint text.

## Error Cases

| Scenario | Behaviour |
|---|---|
| All images fail | Error state, retry button (existing behaviour) |
| Some images fail, some succeed | Review state with yellow warning banner |
| Individual file >5MB | Skipped, counted as failed |
| Zero files selected | No-op (browser prevents this) |

## Testing

- Loading message shows "Reading image N of M…" for each file
- Rooms from all successful images appear merged in review modal
- Warning banner shown when at least one image failed but others succeeded
- Error state shown when all images fail
- Files over 5MB are skipped and counted as failures
- Single-image upload still works exactly as before (no regression)
