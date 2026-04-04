# Change Password — Design Spec
**Date:** 2026-04-04
**Extends:** Todo App (React + Vite + Supabase)

---

## Overview

Two password flows added to the existing app:

1. **Forgot password** — logged-out user requests a reset email, clicks the link, sets a new password
2. **Change password** — logged-in user changes their password from within the todo screen

Both flows converge on a single shared `ChangePasswordForm` component that calls `supabase.auth.updateUser({ password })`.

---

## Components

### New: `src/components/ChangePasswordForm.jsx`

- Two fields: new password, confirm new password
- Client-side validation: passwords must match before any Supabase call is made
- On submit: calls `supabase.auth.updateUser({ password: newPassword })`
- On success: shows "Password updated successfully" message
- On error: shows Supabase error message inline
- Accepts optional `onCancel` prop — renders a Cancel button when provided, omits it when not

### Modified: `src/components/AuthForm.jsx`

Adds a `'forgot'` mode alongside the existing `'signin'` and `'signup'` modes.

- Sign-in screen: "Forgot password?" link switches to `'forgot'` mode
- Forgot mode: single email input + "Send Reset Email" button
  - Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })`
  - On success: replaces form with "Check your email for a reset link" message
  - On error: shows error inline
- Back link in forgot mode returns to `'signin'`

### Modified: `src/components/TodoApp.jsx`

- "Change Password" button added to the header alongside "Sign Out"
- Local `showChangePassword` boolean state (default `false`)
- When `true`: renders `ChangePasswordForm` with `onCancel={() => setShowChangePassword(false)}`
- On successful password update: `ChangePasswordForm` shows success message, then hides after 2 seconds

### Modified: `src/App.jsx`

- `onAuthStateChange` callback extended to watch for the `PASSWORD_RECOVERY` event
- New `isRecovery` boolean state (default `false`)
- When `PASSWORD_RECOVERY` fires: set `isRecovery(true)`
- Render priority: `session === undefined` → null | `isRecovery` → `ChangePasswordForm` (no `onCancel`) | `session` → `TodoApp` | else → `AuthForm`
- After `ChangePasswordForm` succeeds in recovery mode: `isRecovery` is cleared, user lands on `TodoApp`

---

## Data Flow

### Forgot Password
1. AuthForm `'forgot'` mode → `resetPasswordForEmail(email, { redirectTo: window.location.origin })`
2. Supabase emails reset link to user
3. User clicks link → redirected back to app URL
4. `onAuthStateChange` fires with event `PASSWORD_RECOVERY` → `isRecovery: true`
5. `ChangePasswordForm` renders (no Cancel)
6. User submits new password → `updateUser({ password })`
7. Success → `isRecovery: false` → `TodoApp` renders

### Change Password (logged in)
1. User clicks "Change Password" in TodoApp header → `showChangePassword: true`
2. `ChangePasswordForm` renders with `onCancel`
3. User submits new password → `updateUser({ password })`
4. Success → success message shown → auto-hide after 2s (`showChangePassword: false`)
5. Cancel → `showChangePassword: false` immediately

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Passwords don't match | Inline error, no Supabase call |
| Password too short (Supabase rejects) | Inline error from Supabase message |
| `resetPasswordForEmail` fails | Inline error in AuthForm |
| Network error on `updateUser` | Inline error in ChangePasswordForm |

---

## Testing

- `ChangePasswordForm`: renders fields, validates mismatch, calls `updateUser` on valid submit, shows success, shows error, renders Cancel only when `onCancel` provided
- `AuthForm`: "Forgot password?" link appears in signin mode, switches to forgot mode, calls `resetPasswordForEmail`, shows confirmation on success, back link returns to signin
- `TodoApp`: "Change Password" button toggles form, Cancel hides it
- `App`: `PASSWORD_RECOVERY` event renders `ChangePasswordForm` without Cancel

---

## Out of Scope

- Requiring current password before changing (Supabase sessions already verify identity)
- Email change
- Account deletion
