// Hand-written to match supabase/migrations/0001_init.sql.
// Once the project is linked to a real Supabase instance, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts

export type UserRole = "owner" | "resident" | "staff";
export type Locale = "es" | "en";
export type WorkOrderStatus = "open" | "in_progress" | "done" | "skipped";

// "skipped" and "done" both close out a work order (it stops counting as
// pending/overdue and moves to an asset's history) — the difference is
// just whether the maintenance actually happened.
export function isWorkOrderClosed(status: string): boolean {
  return status === "done" || status === "skipped";
}
export type AssetStatus = "active" | "inactive";
export type WorkOrderPriority = "low" | "medium" | "high";
export type WorkOrderSource = "manual" | "pm";
export type IntervalUnit = "days" | "weeks" | "months" | "years";
export type WorkOrderActivityEventType = "status_changed" | "edited";
export type NotificationEventType =
  | "task_assigned"
  | "status_changed"
  | "due_soon"
  | "overdue"
  | "note_flagged"
  | "purchase_urgent";
export type NotificationChannel = "push" | "email";
export type PurchaseItemListType = "groceries" | "urgent";
export type PurchaseItemStatus = "pending" | "purchased";
// Free-form tags the owner types in, not a fixed list — the exact words
// people already recognize a vendor by ("Bomba Agua Tanque Reserva",
// "Mulita", "Vecino"...) matter more here than a tidy fixed taxonomy.
export type VendorTrade = string;
// expenses.category/subcategory are plain text in the DB (see 0019) so new
// categories never need a migration — these unions are just what the
// current screens know how to render. "planilla" is the only category with
// a UI today.
export type ExpenseCategory = "planilla";
export type PayrollSubcategory = "quincena" | "decimo" | "vacacion" | "adelanto" | "liquidacion";
export type LoanCategory = "prestamo" | "adelanto";
export type LoanStatus = "active" | "cancelled";
export type LoanRequestStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "efectivo" | "transferencia" | "yappy" | "cheque";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          locale: Locale;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          locale?: Locale;
        };
        Update: Partial<{
          full_name: string;
          role: UserRole;
          phone: string | null;
          email: string | null;
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
          avatar_url: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vendors"]["Row"], "id" | "created_at" | "avatar_url"> & {
          avatar_url?: string | null;
        };
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
          status: AssetStatus;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assets"]["Row"], "id" | "created_at" | "status"> & {
          status?: AssetStatus;
        };
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
          series_id: string | null;
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
      work_order_activity: {
        Row: {
          id: string;
          work_order_id: string;
          actor_id: string;
          event_type: WorkOrderActivityEventType;
          meta: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["work_order_activity"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["work_order_activity"]["Insert"]>;
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
      purchase_items: {
        Row: {
          id: string;
          title: string;
          quantity: string | null;
          notes: string | null;
          list_type: PurchaseItemListType;
          status: PurchaseItemStatus;
          requested_by: string;
          purchased_by: string | null;
          purchased_at: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["purchase_items"]["Row"],
          "id" | "status" | "purchased_by" | "purchased_at" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["purchase_items"]["Insert"]>;
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
          birth_date: string | null;
          termination_date: string | null;
          id_document_path: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff_details"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["staff_details"]["Insert"]>;
      };
      staff_salary_history: {
        Row: {
          id: string;
          user_id: string;
          salary: number;
          effective_date: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff_salary_history"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["staff_salary_history"]["Insert"]>;
      };
      expenses: {
        Row: {
          id: string;
          date: string;
          category: string;
          subcategory: string | null;
          amount: number;
          expected_amount: number | null;
          person_id: string | null;
          vendor_id: string | null;
          asset_id: string | null;
          payment_method: string | null;
          loan_id: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };
      payroll_loans: {
        Row: {
          id: string;
          person_id: string;
          category: LoanCategory;
          principal_amount: number;
          num_installments: number;
          request_date: string;
          start_year: number;
          start_month: number;
          start_half: 1 | 2;
          status: LoanStatus;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payroll_loans"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payroll_loans"]["Insert"]>;
      };
      payroll_loan_payments: {
        Row: {
          id: string;
          loan_id: string;
          amount: number;
          payment_date: string;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payroll_loan_payments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payroll_loan_payments"]["Insert"]>;
      };
      payroll_loan_requests: {
        Row: {
          id: string;
          person_id: string;
          category: LoanCategory;
          amount: number;
          request_date: string;
          status: LoanRequestStatus;
          notes: string | null;
          loan_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payroll_loan_requests"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payroll_loan_requests"]["Insert"]>;
      };
      payroll_entries: {
        Row: {
          id: string;
          person_id: string;
          period_year: number;
          period_month: number;
          period_half: 1 | 2;
          base_pay: number;
          extra_hours: number;
          extra_hours_amount: number;
          extra_days: number;
          extra_days_amount: number;
          bonus: number;
          dias_libres: number;
          horas_descontadas: number;
          horas_descontadas_amount: number;
          dias_descontados: number;
          dias_descontados_amount: number;
          other_deduction: number;
          decimo_paid: number;
          vacation_paid: number;
          prima_paid: number;
          payment_method: PaymentMethod;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payroll_entries"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["payroll_entries"]["Insert"]>;
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
