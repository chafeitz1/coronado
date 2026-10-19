<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design system — one system for the whole app

This app has a single hand-rolled design system. New features extend it; they never bring in a second one.

- **Styling tokens**: `src/lib/ui.ts` exports every shared class string (`card`, `listCard`, `listRow`, `buttonPrimary`, `buttonSecondary`, `buttonUtility`, `buttonGhost`, `input`, `pageHeading`, `sectionHeading`, `mutedText`, `emptyState`). Use these, don't invent parallel ones.
- **Reusable UI**: check `src/components/ui/*` before writing a new primitive — `SidePanel` for any overlay/flyout (create/edit/detail), `Field`, `SubmitButton`, `ConfirmSubmitButton`, `Combobox`, `badge.tsx`, `empty-state.tsx`, etc. already exist.
- **No new component library.** Don't add shadcn/ui, Radix, or any other UI kit — everything here is plain Tailwind + the tokens above. If something's missing, add it to `lib/ui.ts` or `components/ui/`, in the same flat/bordered style as what's already there.
- **Colors**: only the CSS variables already defined in `src/app/globals.css` (`--ink`, `--surface`, `--hairline`, `--primary`, `--status-*`, etc.), which resolve for both light and dark mode automatically. Never raw Tailwind palette classes (`bg-blue-500`, `text-red-600`, `border-gray-200`, ...).
- **No drop shadows.** Panels and cards are flat, bordered surfaces (`border border-hairline`) — this is deliberate (MaintainX-style "windows"), not an oversight to fix later.
- **Every interactive element needs a same-color `active:` mirror of its `hover:`** (see any `button*` token in `lib/ui.ts` for the pattern). Touch devices fire `:active`, not `:hover` — skipping this means tapping a button on a phone gives zero visual feedback until the action finishes.
- **Mobile-first.** Check any new screen at phone width before calling it done — no fixed-width tables or layouts that force horizontal scroll without an explicit, deliberate scroll affordance.
