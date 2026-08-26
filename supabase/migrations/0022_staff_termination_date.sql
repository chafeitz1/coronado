-- Employment end date, alongside hire_date/birth_date already on
-- staff_details. Nullable: still-active staff have no termination_date.
-- Powers Planilla's "personal que ya no labora" split and freezes décimo/
-- vacación accrual as of that date instead of letting it keep growing.

alter table public.staff_details add column termination_date date;
