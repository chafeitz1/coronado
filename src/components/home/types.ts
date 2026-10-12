export type RoutineItem = {
  id: string;
  time: string;
  title: string;
  steps: string | null;
};

// A single human action on a task — created it, changed its status, or
// edited it — merged from work_orders (creations) and work_order_activity
// (everything after that) and pre-formatted server-side, so Home's Recent
// Activity reads as an actual action instead of just a task title with a
// status badge next to it.
export type ActivityEvent = {
  id: string;
  workOrderId: string;
  actorName: string;
  // "{verb} \"{title}\"", already localized and fully assembled — see
  // page.tsx, same template as the push/email notification body.
  text: string;
  createdAt: string;
};
