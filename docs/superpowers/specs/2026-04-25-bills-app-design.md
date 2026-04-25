# Bills App — Design Spec
**Date:** 2026-04-25
**Project:** portfolio-website (formerly todo-app)

---

## Overview

A billing/estimate generation app for a curtain tailor, built into the existing React + Supabase SPA. Auth is shared with the existing todo app — same login credentials, no separate signup. The app lets the user manage a catalogue of rooms and products, then compose per-customer bills with room-by-room line items and a final totals block including optional charges and advance payment.

---

## Architecture

### Route
- `/projects/bills` — auth-gated using the same `TodoRoute` pattern in `src/App.jsx`

### Component Tree
```
BillsApp              — tab shell (Bills | Manage Rooms | Manage Products)
├── BillsList         — list of all bills, + New Bill
├── BillEditor        — create / edit a bill
├── BillPrint         — print-only view (no UI chrome)
├── ManageRooms       — CRUD for room names
└── ManageProducts    — CRUD for products (name, unit, default price)
```

### Navigation
- "Bills" link added to `Nav.jsx`, visible only when a Supabase session exists (same conditional already used for the Todo link)

---

## Data Model

All tables use Supabase Row Level Security. Every table has a `user_id` column linked to `auth.users`. Users can only read and write their own rows.

### `rooms`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| name | text | e.g. "Living Room", "Dining", "Den" |
| user_id | uuid | FK → auth.users |
| created_at | timestamptz | default now() |

### `products`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. "Roman Blind", "Blackout" |
| unit | text | sqft / mts / rn ft / piece / on ft |
| price | numeric | default price per unit |
| user_id | uuid | FK → auth.users |
| created_at | timestamptz | |

### `bills`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| customer_name | text | typed fresh per bill |
| date | date | defaults to today |
| cartage | numeric | default 0 |
| labor_charges | numeric | default 0 |
| advance_payment | numeric | default 0 |
| user_id | uuid | FK → auth.users |
| created_at | timestamptz | |

### `bill_rooms`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| bill_id | uuid | FK → bills, ON DELETE CASCADE |
| room_id | uuid | FK → rooms (for reference only) |
| room_name | text | snapshotted at time of adding |
| sort_order | integer | controls display order |

### `bill_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| bill_room_id | uuid | FK → bill_rooms, ON DELETE CASCADE |
| product_name | text | snapshotted from product |
| unit | text | snapshotted from product |
| quantity | numeric | user-entered |
| price | numeric | snapshotted from product, editable per item |
| total | numeric | quantity × price, computed and stored |

**Snapshot rationale:** Product name, unit, and price are copied into `bill_items` when an item is added. Room name is copied into `bill_rooms`. This ensures historical bills remain accurate even if the user later renames a room or changes a product's price.

---

## SQL Setup

The following SQL should be run in the Supabase dashboard (SQL editor) once before using the app:

```sql
-- Rooms
create table rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  user_id uuid references auth.users not null,
  created_at timestamptz default now()
);
alter table rooms enable row level security;
create policy "own rooms" on rooms for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Products
create table products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  unit text not null default 'sqft',
  price numeric not null default 0,
  user_id uuid references auth.users not null,
  created_at timestamptz default now()
);
alter table products enable row level security;
create policy "own products" on products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bills
create table bills (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null default '',
  date date not null default current_date,
  cartage numeric not null default 0,
  labor_charges numeric not null default 0,
  advance_payment numeric not null default 0,
  user_id uuid references auth.users not null,
  created_at timestamptz default now()
);
alter table bills enable row level security;
create policy "own bills" on bills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bill Rooms
create table bill_rooms (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references bills on delete cascade not null,
  room_id uuid references rooms,
  room_name text not null,
  sort_order integer not null default 0
);
alter table bill_rooms enable row level security;
create policy "own bill_rooms" on bill_rooms for all using (
  exists (select 1 from bills where bills.id = bill_rooms.bill_id and bills.user_id = auth.uid())
) with check (
  exists (select 1 from bills where bills.id = bill_rooms.bill_id and bills.user_id = auth.uid())
);

-- Bill Items
create table bill_items (
  id uuid default gen_random_uuid() primary key,
  bill_room_id uuid references bill_rooms on delete cascade not null,
  product_name text not null,
  unit text not null,
  quantity numeric not null default 0,
  price numeric not null default 0,
  total numeric not null default 0
);
alter table bill_items enable row level security;
create policy "own bill_items" on bill_items for all using (
  exists (
    select 1 from bill_rooms
    join bills on bills.id = bill_rooms.bill_id
    where bill_rooms.id = bill_items.bill_room_id
    and bills.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from bill_rooms
    join bills on bills.id = bill_rooms.bill_id
    where bill_rooms.id = bill_items.bill_room_id
    and bills.user_id = auth.uid()
  )
);
```

---

## UI Flow

### BillsList
- Table: Customer Name | Date | Grand Total | Balance Due | Actions (Edit, Delete)
- "+ New Bill" button: inserts a blank bill in Supabase, navigates to BillEditor
- Click any row to open BillEditor in edit mode

### BillEditor
**Header:**
- Customer name input (auto-saves on blur)
- Date input (auto-saves on blur)
- "Print" button → triggers `window.print()` which renders BillPrint

**Rooms (continuous scroll):**
- Each room is a vertical section with a green room name header
- Room header row: room name (selected from saved rooms dropdown) + delete room button
- Item table columns: Product (dropdown) | Unit (auto-filled, read-only) | Qty (number input) | Rate (number input, pre-filled from product default) | Amount (qty × rate, calculated)
- Each product dropdown selection auto-fills unit and rate
- Rate is editable after auto-fill
- Amount recalculates instantly on qty or rate change — saved to Supabase on blur
- "+ Add Item" link below each room's table
- Room subtotal shown bottom-right of each room section
- "+ Add Room" button below all rooms

**Grand Total block:**
```
Rooms Subtotal     ₹ xxx
+ Cartage          [input]
+ Labour Charges   [input]
─────────────────────────
Grand Total        ₹ xxx
− Advance Paid     [input]
─────────────────────────
Balance Due        ₹ xxx
```
Cartage, Labour Charges, and Advance Paid auto-save on blur.

### BillPrint
- Rendered as a separate component, visible only during `window.print()` via print CSS (`@media print`)
- Content: customer name, date, rooms as plain tables (Product | Unit | Qty | Rate | Amount), room subtotals, grand total block
- No navigation, buttons, or UI chrome
- Uses `@media print { body > * { display: none } .print-only { display: block } }` pattern

### ManageRooms
- List of saved room names
- Inline add: text input + Enter to save
- Inline edit: click name to edit in place, Enter or blur to save
- Delete button with confirmation

### ManageProducts
- List of products, each row: Name | Unit (dropdown) | Price | Edit | Delete
- Inline add at bottom
- Inline edit in place

---

## Styling
- Matches existing dark monochrome theme: `#0f0f0f` background, `#00ff88` green accent, `#e0e0e0` text
- All styles added to the existing `src/index.css` — no new CSS files
- Print styles scoped to `@media print`

---

## Files

### New files
- `src/components/BillsApp.jsx`
- `src/components/BillsList.jsx`
- `src/components/BillEditor.jsx`
- `src/components/BillPrint.jsx`
- `src/components/ManageRooms.jsx`
- `src/components/ManageProducts.jsx`

### Modified files
- `src/App.jsx` — add `/projects/bills` route
- `src/components/Nav.jsx` — add Bills nav link
- `src/index.css` — add bill app styles + print styles

---

## Out of Scope (MVP)
- Customer address / GST number on bills
- Bill numbering / sequential estimate IDs
- Multiple users / team access
- Email or WhatsApp sharing of bills
- Currency other than INR
