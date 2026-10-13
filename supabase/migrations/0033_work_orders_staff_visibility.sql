-- Staff could previously only see/update a work order if it was assigned
-- to them or they created it themselves — residents (who never act on
-- tasks at all) could already see every one. That left any unassigned
-- task (including the whole upcoming bulk-loaded general task list,
-- intentionally left unassigned) invisible to staff, who are exactly who
-- needs to see and complete them.

alter policy work_orders_select on public.work_orders
using (
  is_owner()
  or "current_role"() = any (array['resident', 'staff'])
  or assigned_to = auth.uid()
  or created_by = auth.uid()
);

alter policy work_orders_update on public.work_orders
using (
  is_owner()
  or "current_role"() = 'staff'
  or assigned_to = auth.uid()
);
