// Hand-written to match supabase/migrations/0001_init.sql.
// Once the project is linked to a real Supabase instance, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts

export type UserRole = "owner" | "family" | "staff";
export type WorkOrderStatus = "open" | "in_progress" | "done";
export type WorkOrderPriority = "low" | "medium" | "high";
export type WorkOrderSource = "manual" | "pm";
export type IntervalUnit = "days" | "weeks" | "months" | "years";
export type NotificationEventType =
  | "task_assigned"
  | "status_changed"
  | "due_soon"
  | "overdue"
  | "note_flagged";
export type NotificationChannel = "push" | "email";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          phone?: string | null;
        };
        Update: Partial<{
          full_name: string;
          role: UserRole;
          phone: string | null;
        }>;
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          trade: string | null;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vendors"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["vendors"]["Insert"]>;
      };
      assets: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          location: string | null;
          purchase_date: string | null;
          warranty_expires: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assets"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
      };
      pm_schedules: {
        Row: {
          id: string;
          asset_id: string;
          title: string;
          description: string | null;
          interval_unit: IntervalUnit;
          interval_value: number;
          next_due_date: string;
          default_assignee: string | null;
          active: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pm_schedules"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pm_schedules"]["Insert"]>;
      };
      work_orders: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: WorkOrderStatus;
          priority: WorkOrderPriority;
          asset_id: string | null;
          vendor_id: string | null;
          assigned_to: string | null;
          created_by: string;
          due_date: string | null;
          completed_at: string | null;
          source: WorkOrderSource;
          pm_schedule_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Omit<Database["public"]["Tables"]["work_orders"]["Row"], "id" | "created_at" | "updated_at">
        > &
          Pick<Database["public"]["Tables"]["work_orders"]["Row"], "title" | "created_by">;
        Update: Partial<Database["public"]["Tables"]["work_orders"]["Insert"]>;
      };
      work_order_notes: {
        Row: {
          id: string;
          work_order_id: string;
          author_id: string;
          body: string;
          notify_owner: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["work_order_notes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["work_order_notes"]["Insert"]>;
      };
      attachments: {
        Row: {
          id: string;
          work_order_id: string | null;
          asset_id: string | null;
          storage_path: string;
          file_name: string;
          uploaded_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["attachments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["attachments"]["Insert"]>;
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          event_type: NotificationEventType;
          channel: NotificationChannel;
          enabled: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["notification_preferences"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["notification_preferences"]["Insert"]>;
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["push_subscriptions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
      };
    };
  };
}
