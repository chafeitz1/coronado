-- Middle state for urgent items between "requested" and "purchased": the
-- owner places the order (often remotely, e.g. Amazon) and marks it here;
-- staff on-site then confirms receipt via the existing purchased toggle.
-- Separate from `status` (which stays "pending" the whole time) since this
-- is informational tracking, not a gate on anything else in the app.
alter table public.purchase_items
  add column ordered_at timestamptz,
  add column ordered_by uuid references public.profiles (id);
