// Hand-written to match supabase/migrations/0001_init.sql.
// Once the project is linked to a real Supabase instance, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts

export type UserRole = "owner" | "family" | "staff";
export type Locale = "es" | "en";
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
// Free-form tags the owner types in, not a fixed list — the exact words
// people already recognize a vendor by ("Bomba Agua Tanque Reserva",
// "Mulita", "Vecino"...) matter more here than a tidy fixed taxonomy.
export type VendorTrade = string;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          phone: string | null;
          avatar_url: string | null;
          locale: Locale;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          phone?: string | null;
          avatar_url?: string | null;
          locale?: Locale;
        };
        Update: Partial<{
          full_name: string;
          role: UserRole;
          phone: string | null;
          avatar_url: string | null;
          locale: Locale;
        }>;
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          trades: VendorTrade[];
          notes: string | null;
          is_emergency: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vendors"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["vendors"]["Insert"]>;
      };
      vendor_contacts: {
        Row: {
          id: string;
          vendor_id: string;
          contact_name: string | null;
          role_label: string | null;
          phone: string | null;
          email: string | null;
          position: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vendor_contacts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["vendor_contacts"]["Insert"]>;
      };
      assets: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          location: string | null;
          brand: string | null;
          model: string | null;
          serial_number: string | null;
          preferred_vendor_id: string | null;
          purchase_date: string | null;
          warranty_expires: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assets"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
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
          recurrence_interval_value: number | null;
          recurrence_interval_unit: IntervalUnit | null;
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
      staff_details: {
        Row: {
          user_id: string;
          hire_date: string | null;
          salary: number | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff_details"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["staff_details"]["Insert"]>;
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
