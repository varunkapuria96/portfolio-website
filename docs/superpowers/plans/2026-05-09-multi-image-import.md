# Multi-Image Bill Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to select and import multiple images at once, processing each sequentially and merging all extracted rooms into a single review modal.

**Architecture:** `BillImportModal` gains two new props (`loadingMessage`, `warningMessage`) so the parent can drive progress text and surface partial failures. `BillEditor` replaces `handleImageFile(file)` with `handleImageFiles(files)` which loops through a `FileList`, accumulates rooms from successful images, counts failures, and opens the review modal with a warning when some images failed.

**Tech Stack:** React 19, Vitest, @testing-library/react, Supabase Edge Functions

---

### Task 1: Add loadingMessage and warningMessage props to BillImportModal

**Files:**
- Modify: `src/components/BillImportModal.jsx:14,70-92`
- Test: `src/components/BillImportModal.test.jsx`

- [ ] **Step 1: Write failing tests**

Add these three tests to `src/components/BillImportModal.test.jsx` (before the closing `})`):

```jsx
it('shows custom loadingMessage when provided', () => {
  render(
    <BillImportModal
      status="loading"
      extractedRooms={[]}
      loadingMessage="Reading image 2 of 3…"
      onConfirm={vi.fn()}
      onClose={vi.fn()}
      onRetry={vi.fn()}
    />
  )
  expect(screen.getByText('Reading image 2 of 3…')).toBeInTheDocument()
  expect(screen.queryByText('Reading your note…')).not.toBeInTheDocument()
})

it('falls back to default loading text when loadingMessage is not provided', () => {
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
})

it('shows warning banner in review state when warningMessage is provided', () => {
  render(
    <BillImportModal
      status="review"
      extractedRooms={sampleRooms}
      warningMessage="1 of 2 images couldn't be read — rooms below are from the others"
      onConfirm={vi.fn()}
      onClose={vi.fn()}
      onRetry={vi.fn()}
    />
  )
  expect(screen.getByText(/1 of 2 images couldn't be read/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/BillImportModal.test.jsx --reporter=verbose
```

Expected: 3 new tests fail.

- [ ] **Step 3: Update BillImportModal props and loading state**

In `src/components/BillImportModal.jsx`, update line 14 (the function signature):

```jsx
export default function BillImportModal({ status, extractedRooms, errorMessage, loadingMessage, warningMessage, onConfirm, onClose, onRetry, availableRooms = [], availableProducts = [], onAddRoom, onAddProduct }) {
```

Update the loading block (lines 70–76) to use the prop:

```jsx
{status === 'loading' && (
  <div className="import-loading">
    <div className="import-spinner" />
    <div>{loadingMessage || 'Reading your note…'}</div>
    <div className="import-loading-sub">This takes a few seconds</div>
  </div>
)}
```

Update the review block — add the warning banner immediately before the `<p className="import-hint">` line (inside the `<>` fragment, which starts around line 89):

```jsx
{status === 'review' && (
  rooms.length === 0 ? (
    <div className="import-no-rooms">No rooms found — try a clearer photo</div>
  ) : (
    <>
      {warningMessage && (
        <div className="import-warning">{warningMessage}</div>
      )}
      <p className="import-hint">
        Review and edit before adding to bill. Highlighted items weren't matched to your catalogue.
      </p>
      {rooms.map((room, roomIdx) => {
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/BillImportModal.test.jsx --reporter=verbose
```

Expected: all 11 tests pass.

- [ ] **Step 5: Add .import-warning CSS class**

In `src/index.css`, find the block of `.import-*` classes (before `@media print`) and add after `.import-hint`:

```css
.import-warning {
  background: #fff8e1;
  border: 1px solid #f5c518;
  border-radius: 6px;
  color: #7a5c00;
  font-size: 13px;
  margin-bottom: 12px;
  padding: 8px 12px;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/BillImportModal.jsx src/components/BillImportModal.test.jsx src/index.css
git commit -m "feat: add loadingMessage and warningMessage props to BillImportModal"
```

---

### Task 2: Update BillEditor to handle multiple images

**Files:**
- Modify: `src/components/BillEditor.jsx:26-31,135-170,268-275,447-460`

- [ ] **Step 1: Add importProgress and importWarning state**

In `src/components/BillEditor.jsx`, find the block of import-related state declarations (around lines 26–31):

```jsx
const [importModalOpen, setImportModalOpen] = useState(false)
const [importStatus, setImportStatus] = useState('loading')
const [importExtracted, setImportExtracted] = useState([])
const [importError, setImportError] = useState('')
const [importFileError, setImportFileError] = useState('')
const [importWarning, setImportWarning] = useState('')
const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
```

(Add the last two lines — `importWarning` and `importProgress` — to the existing block.)

- [ ] **Step 2: Replace handleImageFile with handleImageFiles**

Delete the existing `handleImageFile` function (lines 135–170) and replace it with:

```jsx
async function handleImageFiles(files) {
  const fileList = Array.from(files)
  const total = fileList.length

  setImportFileError('')
  setImportModalOpen(true)
  setImportStatus('loading')
  setImportError('')
  setImportWarning('')
  setImportExtracted([])
  setImportProgress({ current: 0, total })

  const allRooms = []
  let failedCount = 0

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    setImportProgress({ current: i + 1, total })

    if (file.size > 5 * 1024 * 1024) {
      failedCount++
      continue
    }

    let base64
    try {
      base64 = await fileToBase64(file)
    } catch {
      failedCount++
      continue
    }

    const { data, error } = await supabase.functions.invoke('extract-bill-image', {
      body: {
        image_base64: base64,
        media_type: file.type,
        products: availableProducts.map(p => ({ name: p.name, unit: p.unit, price: p.price })),
      },
    })

    if (error || data?.error || !Array.isArray(data?.rooms)) {
      failedCount++
      continue
    }

    allRooms.push(...data.rooms)
  }

  if (allRooms.length === 0) {
    setImportStatus('error')
    setImportError(
      failedCount > 0
        ? 'None of the images could be read — try clearer photos'
        : 'No rooms found in the images'
    )
    return
  }

  setImportExtracted(allRooms)
  if (failedCount > 0) {
    setImportWarning(
      `${failedCount} of ${total} image${total > 1 ? 's' : ''} couldn't be read — rooms below are from the others`
    )
  }
  setImportStatus('review')
}
```

- [ ] **Step 3: Update the file input to accept multiple files**

Find the hidden file input (around line 268–274):

```jsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  multiple
  style={{ display: 'none' }}
  onChange={e => { if (e.target.files?.length) handleImageFiles(e.target.files); e.target.value = '' }}
/>
```

(Add `multiple` and change `e.target.files?.[0]` / `handleImageFile` to `e.target.files?.length` / `handleImageFiles`.)

- [ ] **Step 4: Pass new props to BillImportModal**

Find the `<BillImportModal` usage (around line 447) and add `loadingMessage` and `warningMessage`:

```jsx
{importModalOpen && (
  <BillImportModal
    status={importStatus}
    extractedRooms={importExtracted}
    errorMessage={importError}
    loadingMessage={
      importProgress.total > 1
        ? `Reading image ${importProgress.current} of ${importProgress.total}…`
        : undefined
    }
    warningMessage={importWarning}
    availableRooms={availableRooms}
    availableProducts={availableProducts}
    onAddRoom={addRoomToCatalogue}
    onAddProduct={addProductToCatalogue}
    onConfirm={addImportedRooms}
    onClose={() => setImportModalOpen(false)}
    onRetry={() => fileInputRef.current?.click()}
  />
)}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run --reporter=verbose
```

Expected: all 57 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/BillEditor.jsx
git commit -m "feat: support multiple image upload in bill import"
```
