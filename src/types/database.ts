export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          page_path: string | null
          properties: Json | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          page_path?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          page_path?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_name: string
          last_used_at: string | null
          permissions: Json
          provider_id: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_name: string
          last_used_at?: string | null
          permissions: Json
          provider_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_name?: string
          last_used_at?: string | null
          permissions?: Json
          provider_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "api_keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      booking_commitments: {
        Row: {
          booking_id: string
          capacity_scope: Database["public"]["Enums"]["capacity_scope_type"]
          committed_from: string
          committed_to: string
          completed_at: string | null
          concurrent_units_reserved: number
          created_at: string
          created_by: string | null
          id: string
          provider_id: string
          released_at: string | null
          released_reason: string | null
          service_id: string
          status: string
        }
        Insert: {
          booking_id: string
          capacity_scope: Database["public"]["Enums"]["capacity_scope_type"]
          committed_from: string
          committed_to: string
          completed_at?: string | null
          concurrent_units_reserved: number
          created_at?: string
          created_by?: string | null
          id?: string
          provider_id: string
          released_at?: string | null
          released_reason?: string | null
          service_id: string
          status?: string
        }
        Update: {
          booking_id?: string
          capacity_scope?: Database["public"]["Enums"]["capacity_scope_type"]
          committed_from?: string
          committed_to?: string
          completed_at?: string | null
          concurrent_units_reserved?: number
          created_at?: string
          created_by?: string | null
          id?: string
          provider_id?: string
          released_at?: string | null
          released_reason?: string | null
          service_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_commitments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commitments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commitments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commitments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "booking_commitments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commitments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commitments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_delivery_details: {
        Row: {
          booking_id: string
          created_at: string | null
          delivery_photos: Json | null
          delivery_type: string | null
          dropoff_instructions: string | null
          dropoff_location_id: string
          dropoff_time_window_end: string | null
          dropoff_time_window_start: string | null
          item_description: string
          pickup_instructions: string | null
          pickup_location_id: string
          pickup_photos: Json | null
          pickup_time_window_end: string | null
          pickup_time_window_start: string | null
          proof_of_delivery_required: boolean | null
          quantity: number
          requires_signature: boolean | null
          special_instructions: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          delivery_photos?: Json | null
          delivery_type?: string | null
          dropoff_instructions?: string | null
          dropoff_location_id: string
          dropoff_time_window_end?: string | null
          dropoff_time_window_start?: string | null
          item_description: string
          pickup_instructions?: string | null
          pickup_location_id: string
          pickup_photos?: Json | null
          pickup_time_window_end?: string | null
          pickup_time_window_start?: string | null
          proof_of_delivery_required?: boolean | null
          quantity: number
          requires_signature?: boolean | null
          special_instructions?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          delivery_photos?: Json | null
          delivery_type?: string | null
          dropoff_instructions?: string | null
          dropoff_location_id?: string
          dropoff_time_window_end?: string | null
          dropoff_time_window_start?: string | null
          item_description?: string
          pickup_instructions?: string | null
          pickup_location_id?: string
          pickup_photos?: Json | null
          pickup_time_window_end?: string | null
          pickup_time_window_start?: string | null
          proof_of_delivery_required?: boolean | null
          quantity?: number
          requires_signature?: boolean | null
          special_instructions?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_delivery_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_delivery_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_delivery_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_delivery_details_dropoff_location_id_fkey"
            columns: ["dropoff_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_delivery_details_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_disputes: {
        Row: {
          booking_id: string
          created_at: string | null
          description: string
          desired_resolution: string | null
          dispute_type: string
          evidence_urls: Json | null
          id: string
          refund_amount: number | null
          refund_status: string | null
          reported_by: string
          reported_by_role: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["dispute_severity"] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          description: string
          desired_resolution?: string | null
          dispute_type: string
          evidence_urls?: Json | null
          id?: string
          refund_amount?: number | null
          refund_status?: string | null
          reported_by: string
          reported_by_role: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["dispute_severity"] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          description?: string
          desired_resolution?: string | null
          dispute_type?: string
          evidence_urls?: Json | null
          id?: string
          refund_amount?: number | null
          refund_status?: string | null
          reported_by?: string
          reported_by_role?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["dispute_severity"] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_emergency_details: {
        Row: {
          access_notes: string | null
          booking_id: string
          created_at: string | null
          damage_risk_level: Database["public"]["Enums"]["damage_risk_level"]
          is_immediate: boolean | null
          problem_description: string
          problem_photos: Json | null
          updated_at: string | null
        }
        Insert: {
          access_notes?: string | null
          booking_id: string
          created_at?: string | null
          damage_risk_level: Database["public"]["Enums"]["damage_risk_level"]
          is_immediate?: boolean | null
          problem_description: string
          problem_photos?: Json | null
          updated_at?: string | null
        }
        Update: {
          access_notes?: string | null
          booking_id?: string
          created_at?: string | null
          damage_risk_level?: Database["public"]["Enums"]["damage_risk_level"]
          is_immediate?: boolean | null
          problem_description?: string
          problem_photos?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_emergency_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_emergency_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_emergency_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_followups: {
        Row: {
          created_at: string | null
          followup_booking_id: string | null
          followup_sequence: number
          id: string
          notes: string | null
          original_booking_id: string
          scheduled_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          followup_booking_id?: string | null
          followup_sequence: number
          id?: string
          notes?: string | null
          original_booking_id: string
          scheduled_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          followup_booking_id?: string | null
          followup_sequence?: number
          id?: string
          notes?: string | null
          original_booking_id?: string
          scheduled_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_followups_followup_booking_id_fkey"
            columns: ["followup_booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_followups_followup_booking_id_fkey"
            columns: ["followup_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_followups_followup_booking_id_fkey"
            columns: ["followup_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_followups_original_booking_id_fkey"
            columns: ["original_booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_followups_original_booking_id_fkey"
            columns: ["original_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_followups_original_booking_id_fkey"
            columns: ["original_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_media: {
        Row: {
          booking_id: string
          caption: string | null
          created_at: string | null
          id: string
          media_type: string
          media_url: string
          stage: string
          uploaded_by: string
          uploaded_by_role: string
        }
        Insert: {
          booking_id: string
          caption?: string | null
          created_at?: string | null
          id?: string
          media_type: string
          media_url: string
          stage: string
          uploaded_by: string
          uploaded_by_role: string
        }
        Update: {
          booking_id?: string
          caption?: string | null
          created_at?: string | null
          id?: string
          media_type?: string
          media_url?: string
          stage?: string
          uploaded_by?: string
          uploaded_by_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_media_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_media_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_media_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_messages: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount: number
          amount_mismatch: boolean
          booking_id: string
          claimed_amount: number | null
          confirmed_at: string | null
          created_at: string
          currency: string
          expires_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          initiated_at: string
          metadata: Json | null
          mpesa_checkout_request_id: string | null
          mpesa_merchant_request_id: string | null
          mpesa_phone: string | null
          mpesa_receipt_number: string | null
          mpesa_result_code: number | null
          mpesa_result_desc: string | null
          needs_reconciliation: boolean
          payer_id: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          platform_fee: number
          provider_amount: number
          provider_id: string
          reconciliation_note: string | null
          refunded_at: string | null
          settlement_verified_by: string | null
          status: Database["public"]["Enums"]["payment_transaction_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          amount_mismatch?: boolean
          booking_id: string
          claimed_amount?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_at?: string
          metadata?: Json | null
          mpesa_checkout_request_id?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_phone?: string | null
          mpesa_receipt_number?: string | null
          mpesa_result_code?: number | null
          mpesa_result_desc?: string | null
          needs_reconciliation?: boolean
          payer_id: string
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          platform_fee?: number
          provider_amount: number
          provider_id: string
          reconciliation_note?: string | null
          refunded_at?: string | null
          settlement_verified_by?: string | null
          status?: Database["public"]["Enums"]["payment_transaction_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_mismatch?: boolean
          booking_id?: string
          claimed_amount?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_at?: string
          metadata?: Json | null
          mpesa_checkout_request_id?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_phone?: string | null
          mpesa_receipt_number?: string | null
          mpesa_result_code?: number | null
          mpesa_result_desc?: string | null
          needs_reconciliation?: boolean
          payer_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          platform_fee?: number
          provider_amount?: number
          provider_id?: string
          reconciliation_note?: string | null
          refunded_at?: string | null
          settlement_verified_by?: string | null
          status?: Database["public"]["Enums"]["payment_transaction_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "booking_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_personal_details: {
        Row: {
          booking_id: string
          child_age_group: string | null
          created_at: string | null
          duration_hours: number
          emergency_contact_name: string
          emergency_contact_phone: string
          luggage_count: number | null
          parent_present: boolean | null
          passenger_count: number | null
          preferences: Json | null
          products_provided_by: string | null
          route_description: string | null
          service_area: string | null
          service_location_id: string
          share_location_with_emergency_contact: boolean | null
          special_needs: string | null
          special_notes: string | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          booking_id: string
          child_age_group?: string | null
          created_at?: string | null
          duration_hours: number
          emergency_contact_name: string
          emergency_contact_phone: string
          luggage_count?: number | null
          parent_present?: boolean | null
          passenger_count?: number | null
          preferences?: Json | null
          products_provided_by?: string | null
          route_description?: string | null
          service_area?: string | null
          service_location_id: string
          share_location_with_emergency_contact?: boolean | null
          special_needs?: string | null
          special_notes?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          booking_id?: string
          child_age_group?: string | null
          created_at?: string | null
          duration_hours?: number
          emergency_contact_name?: string
          emergency_contact_phone?: string
          luggage_count?: number | null
          parent_present?: boolean | null
          passenger_count?: number | null
          preferences?: Json | null
          products_provided_by?: string | null
          route_description?: string | null
          service_area?: string | null
          service_location_id?: string
          share_location_with_emergency_contact?: boolean | null
          special_needs?: string | null
          special_notes?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_personal_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_personal_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_personal_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_personal_details_service_location_id_fkey"
            columns: ["service_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_pest_control_details: {
        Row: {
          affected_areas: Json | null
          booking_id: string
          chemical_used: string | null
          created_at: string | null
          followup_schedule: Json | null
          human_evacuation_duration_hours: number | null
          infestation_level: string
          pest_type: string
          pet_evacuation_required: boolean | null
          post_treatment_instructions: string | null
          preparation_instructions: string | null
          property_size_sqm: number | null
          requires_followup: boolean | null
          safety_level: string | null
          updated_at: string | null
          ventilation_hours: number | null
        }
        Insert: {
          affected_areas?: Json | null
          booking_id: string
          chemical_used?: string | null
          created_at?: string | null
          followup_schedule?: Json | null
          human_evacuation_duration_hours?: number | null
          infestation_level: string
          pest_type: string
          pet_evacuation_required?: boolean | null
          post_treatment_instructions?: string | null
          preparation_instructions?: string | null
          property_size_sqm?: number | null
          requires_followup?: boolean | null
          safety_level?: string | null
          updated_at?: string | null
          ventilation_hours?: number | null
        }
        Update: {
          affected_areas?: Json | null
          booking_id?: string
          chemical_used?: string | null
          created_at?: string | null
          followup_schedule?: Json | null
          human_evacuation_duration_hours?: number | null
          infestation_level?: string
          pest_type?: string
          pet_evacuation_required?: boolean | null
          post_treatment_instructions?: string | null
          preparation_instructions?: string | null
          property_size_sqm?: number | null
          requires_followup?: boolean | null
          safety_level?: string | null
          updated_at?: string | null
          ventilation_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_pest_control_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_pest_control_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_pest_control_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_project_details: {
        Row: {
          booking_id: string
          budget_notes: string | null
          budget_range_max: number | null
          budget_range_min: number | null
          created_at: string | null
          estimated_duration_days: number | null
          expected_start_window: string | null
          flexible_timeline: boolean | null
          floor_count: number | null
          floor_plans: Json | null
          milestone_based: boolean | null
          milestone_descriptions: Json | null
          other_documents: Json | null
          preferred_site_visit_date: string | null
          preferred_site_visit_time: string | null
          project_scope: string | null
          project_summary: string
          property_condition: string | null
          property_size_sqm: number | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          reference_photos: Json | null
          room_count: number | null
          site_visit_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          budget_notes?: string | null
          budget_range_max?: number | null
          budget_range_min?: number | null
          created_at?: string | null
          estimated_duration_days?: number | null
          expected_start_window?: string | null
          flexible_timeline?: boolean | null
          floor_count?: number | null
          floor_plans?: Json | null
          milestone_based?: boolean | null
          milestone_descriptions?: Json | null
          other_documents?: Json | null
          preferred_site_visit_date?: string | null
          preferred_site_visit_time?: string | null
          project_scope?: string | null
          project_summary: string
          property_condition?: string | null
          property_size_sqm?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          reference_photos?: Json | null
          room_count?: number | null
          site_visit_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          budget_notes?: string | null
          budget_range_max?: number | null
          budget_range_min?: number | null
          created_at?: string | null
          estimated_duration_days?: number | null
          expected_start_window?: string | null
          flexible_timeline?: boolean | null
          floor_count?: number | null
          floor_plans?: Json | null
          milestone_based?: boolean | null
          milestone_descriptions?: Json | null
          other_documents?: Json | null
          preferred_site_visit_date?: string | null
          preferred_site_visit_time?: string | null
          project_scope?: string | null
          project_summary?: string
          property_condition?: string | null
          property_size_sqm?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          reference_photos?: Json | null
          room_count?: number | null
          site_visit_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_project_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_project_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_project_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_quotes: {
        Row: {
          booking_id: string
          breakdown: Json | null
          created_at: string | null
          currency: string | null
          customer_response: string | null
          description: string | null
          id: string
          provider_id: string
          quoted_price: number
          responded_at: string | null
          revision_count: number
          sent_at: string | null
          status: string | null
          superseded_at: string | null
          updated_at: string | null
          valid_until: string | null
          validity_days: number | null
          viewed_at: string | null
        }
        Insert: {
          booking_id: string
          breakdown?: Json | null
          created_at?: string | null
          currency?: string | null
          customer_response?: string | null
          description?: string | null
          id?: string
          provider_id: string
          quoted_price: number
          responded_at?: string | null
          revision_count?: number
          sent_at?: string | null
          status?: string | null
          superseded_at?: string | null
          updated_at?: string | null
          valid_until?: string | null
          validity_days?: number | null
          viewed_at?: string | null
        }
        Update: {
          booking_id?: string
          breakdown?: Json | null
          created_at?: string | null
          currency?: string | null
          customer_response?: string | null
          description?: string | null
          id?: string
          provider_id?: string
          quoted_price?: number
          responded_at?: string | null
          revision_count?: number
          sent_at?: string | null
          status?: string | null
          superseded_at?: string | null
          updated_at?: string | null
          valid_until?: string | null
          validity_days?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_quotes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_quotes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_quotes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "booking_quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_recurring_rules: {
        Row: {
          capacity_policy: string | null
          created_at: string | null
          customer_acknowledged_risk: boolean | null
          day_of_month: number | null
          day_of_week: number | null
          ends_at: string | null
          enforce_capacity_at_generation: boolean | null
          frequency: string
          id: string
          interval: number
          is_active: boolean | null
          is_paused: boolean | null
          last_generated_at: string | null
          next_run_at: string
          parent_booking_id: string
          paused_until: string | null
          preferred_time: string | null
          starts_at: string
          total_cancelled: number | null
          total_completed: number | null
          total_generated: number | null
          updated_at: string | null
        }
        Insert: {
          capacity_policy?: string | null
          created_at?: string | null
          customer_acknowledged_risk?: boolean | null
          day_of_month?: number | null
          day_of_week?: number | null
          ends_at?: string | null
          enforce_capacity_at_generation?: boolean | null
          frequency: string
          id?: string
          interval?: number
          is_active?: boolean | null
          is_paused?: boolean | null
          last_generated_at?: string | null
          next_run_at: string
          parent_booking_id: string
          paused_until?: string | null
          preferred_time?: string | null
          starts_at: string
          total_cancelled?: number | null
          total_completed?: number | null
          total_generated?: number | null
          updated_at?: string | null
        }
        Update: {
          capacity_policy?: string | null
          created_at?: string | null
          customer_acknowledged_risk?: boolean | null
          day_of_month?: number | null
          day_of_week?: number | null
          ends_at?: string | null
          enforce_capacity_at_generation?: boolean | null
          frequency?: string
          id?: string
          interval?: number
          is_active?: boolean | null
          is_paused?: boolean | null
          last_generated_at?: string | null
          next_run_at?: string
          parent_booking_id?: string
          paused_until?: string | null
          preferred_time?: string | null
          starts_at?: string
          total_cancelled?: number | null
          total_completed?: number | null
          total_generated?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_recurring_rules_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_recurring_rules_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_recurring_rules_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_standard_details: {
        Row: {
          booking_id: string
          created_at: string | null
          is_flexible_timing: boolean | null
          is_recurring: boolean | null
          job_description: string
          job_type: string | null
          materials_notes: string | null
          materials_provided_by: string | null
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          recurrence_end_date: string | null
          recurrence_pattern: Json | null
          reference_photos: Json | null
          requires_site_visit: boolean | null
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          is_flexible_timing?: boolean | null
          is_recurring?: boolean | null
          job_description: string
          job_type?: string | null
          materials_notes?: string | null
          materials_provided_by?: string | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: Json | null
          reference_photos?: Json | null
          requires_site_visit?: boolean | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          is_flexible_timing?: boolean | null
          is_recurring?: boolean | null
          job_description?: string
          job_type?: string | null
          materials_notes?: string | null
          materials_provided_by?: string | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: Json | null
          reference_photos?: Json | null
          requires_site_visit?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_standard_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_standard_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_standard_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_state_transitions: {
        Row: {
          allowed: boolean
          from_status: Database["public"]["Enums"]["booking_status"]
          notes: string | null
          requires_payment: boolean | null
          requires_provider: boolean | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          allowed?: boolean
          from_status: Database["public"]["Enums"]["booking_status"]
          notes?: string | null
          requires_payment?: boolean | null
          requires_provider?: boolean | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          allowed?: boolean
          from_status?: Database["public"]["Enums"]["booking_status"]
          notes?: string | null
          requires_payment?: boolean | null
          requires_provider?: boolean | null
          to_status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: []
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string
          changed_by_role: string
          created_at: string | null
          from_status: Database["public"]["Enums"]["booking_status"] | null
          id: string
          notes: string | null
          reason: string | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_id: string
          changed_by: string
          changed_by_role: string
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          notes?: string | null
          reason?: string | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_id?: string
          changed_by?: string
          changed_by_role?: string
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          notes?: string | null
          reason?: string | null
          to_status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          abandoned_at: string | null
          abandonment_reason: string | null
          actual_end: string | null
          actual_start: string | null
          agreed_price: number | null
          booking_flow_type: Database["public"]["Enums"]["booking_flow_type"]
          cancellation_reason: string | null
          commitment_level: string | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          currency: string | null
          customer_id: string
          customer_notes: string | null
          estimated_busy_from: string | null
          estimated_busy_to: string | null
          estimated_duration_minutes: number | null
          followup_scheduled_at: string | null
          id: string
          is_recurring_instance: boolean | null
          metadata: Json | null
          parent_booking_id: string | null
          payment_method: string | null
          payment_ref: string | null
          payment_status: string | null
          pricing_snapshot: Json | null
          provider_id: string | null
          provider_notes: string | null
          provider_responded_at: string | null
          provider_viewed_at: string | null
          quoted_price: number | null
          recurrence_sequence: number | null
          requested_at: string | null
          reschedule_count: number | null
          scheduled_end: string | null
          scheduled_start: string | null
          service_id: string
          service_location_id: string | null
          service_type_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
        }
        Insert: {
          abandoned_at?: string | null
          abandonment_reason?: string | null
          actual_end?: string | null
          actual_start?: string | null
          agreed_price?: number | null
          booking_flow_type: Database["public"]["Enums"]["booking_flow_type"]
          cancellation_reason?: string | null
          commitment_level?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id: string
          customer_notes?: string | null
          estimated_busy_from?: string | null
          estimated_busy_to?: string | null
          estimated_duration_minutes?: number | null
          followup_scheduled_at?: string | null
          id?: string
          is_recurring_instance?: boolean | null
          metadata?: Json | null
          parent_booking_id?: string | null
          payment_method?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          pricing_snapshot?: Json | null
          provider_id?: string | null
          provider_notes?: string | null
          provider_responded_at?: string | null
          provider_viewed_at?: string | null
          quoted_price?: number | null
          recurrence_sequence?: number | null
          requested_at?: string | null
          reschedule_count?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_id: string
          service_location_id?: string | null
          service_type_id: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
        }
        Update: {
          abandoned_at?: string | null
          abandonment_reason?: string | null
          actual_end?: string | null
          actual_start?: string | null
          agreed_price?: number | null
          booking_flow_type?: Database["public"]["Enums"]["booking_flow_type"]
          cancellation_reason?: string | null
          commitment_level?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          customer_notes?: string | null
          estimated_busy_from?: string | null
          estimated_busy_to?: string | null
          estimated_duration_minutes?: number | null
          followup_scheduled_at?: string | null
          id?: string
          is_recurring_instance?: boolean | null
          metadata?: Json | null
          parent_booking_id?: string | null
          payment_method?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          pricing_snapshot?: Json | null
          provider_id?: string | null
          provider_notes?: string | null
          provider_responded_at?: string | null
          provider_viewed_at?: string | null
          quoted_price?: number | null
          recurrence_sequence?: number | null
          requested_at?: string | null
          reschedule_count?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_id?: string
          service_location_id?: string | null
          service_type_id?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_location_id_fkey"
            columns: ["service_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          access_instructions: string | null
          address: string
          area: string
          bank_details: Json | null
          building_type: string
          city: string | null
          collection_via_mitasafi: boolean | null
          common_facilities: Json | null
          cover_photo: string | null
          created_at: string | null
          id: string
          landlord_id: string
          landmarks: string | null
          latitude: number | null
          longitude: number | null
          management_type: string | null
          metadata: Json | null
          name: string
          parking: Json | null
          photos: string[] | null
          plot_number: string | null
          policies: Json | null
          security_features: Json | null
          service_charge: number | null
          service_charge_includes: string[] | null
          services: Json | null
          status: string | null
          total_floors: number | null
          total_units: number | null
          updated_at: string | null
          water_power: Json | null
          year_built: number | null
        }
        Insert: {
          access_instructions?: string | null
          address: string
          area: string
          bank_details?: Json | null
          building_type: string
          city?: string | null
          collection_via_mitasafi?: boolean | null
          common_facilities?: Json | null
          cover_photo?: string | null
          created_at?: string | null
          id?: string
          landlord_id: string
          landmarks?: string | null
          latitude?: number | null
          longitude?: number | null
          management_type?: string | null
          metadata?: Json | null
          name: string
          parking?: Json | null
          photos?: string[] | null
          plot_number?: string | null
          policies?: Json | null
          security_features?: Json | null
          service_charge?: number | null
          service_charge_includes?: string[] | null
          services?: Json | null
          status?: string | null
          total_floors?: number | null
          total_units?: number | null
          updated_at?: string | null
          water_power?: Json | null
          year_built?: number | null
        }
        Update: {
          access_instructions?: string | null
          address?: string
          area?: string
          bank_details?: Json | null
          building_type?: string
          city?: string | null
          collection_via_mitasafi?: boolean | null
          common_facilities?: Json | null
          cover_photo?: string | null
          created_at?: string | null
          id?: string
          landlord_id?: string
          landmarks?: string | null
          latitude?: number | null
          longitude?: number | null
          management_type?: string | null
          metadata?: Json | null
          name?: string
          parking?: Json | null
          photos?: string[] | null
          plot_number?: string | null
          policies?: Json | null
          security_features?: Json | null
          service_charge?: number | null
          service_charge_includes?: string[] | null
          services?: Json | null
          status?: string | null
          total_floors?: number | null
          total_units?: number | null
          updated_at?: string | null
          water_power?: Json | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_adjacency: {
        Row: {
          cluster_id: string
          created_at: string | null
          id: string
          primary_category_id: string
          secondary_category_id: string
        }
        Insert: {
          cluster_id: string
          created_at?: string | null
          id?: string
          primary_category_id: string
          secondary_category_id: string
        }
        Update: {
          cluster_id?: string
          created_at?: string | null
          id?: string
          primary_category_id?: string
          secondary_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_adjacency_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_adjacency_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_adjacency_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "cluster_adjacency_secondary_category_id_fkey"
            columns: ["secondary_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_adjacency_secondary_category_id_fkey"
            columns: ["secondary_category_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      cluster_categories: {
        Row: {
          allows_individual: boolean | null
          category_id: string
          cluster_id: string
          created_at: string | null
          display_order: number | null
          is_hub: boolean | null
          requires_company_verification: boolean | null
        }
        Insert: {
          allows_individual?: boolean | null
          category_id: string
          cluster_id: string
          created_at?: string | null
          display_order?: number | null
          is_hub?: boolean | null
          requires_company_verification?: boolean | null
        }
        Update: {
          allows_individual?: boolean | null
          category_id?: string
          cluster_id?: string
          created_at?: string | null
          display_order?: number | null
          is_hub?: boolean | null
          requires_company_verification?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cluster_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "cluster_categories_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          adjacency_model: string | null
          code: string
          created_at: string | null
          id: string
          identity_label_en: string | null
          identity_label_sw: string | null
          is_single_identity: boolean | null
          max_categories_individual: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          adjacency_model?: string | null
          code: string
          created_at?: string | null
          id?: string
          identity_label_en?: string | null
          identity_label_sw?: string | null
          is_single_identity?: boolean | null
          max_categories_individual?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          adjacency_model?: string | null
          code?: string
          created_at?: string | null
          id?: string
          identity_label_en?: string | null
          identity_label_sw?: string | null
          is_single_identity?: boolean | null
          max_categories_individual?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled_for_provider_ids: Json | null
          enabled_for_user_ids: Json | null
          flag_key: string
          flag_name: string
          id: string
          is_enabled: boolean | null
          rollout_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled_for_provider_ids?: Json | null
          enabled_for_user_ids?: Json | null
          flag_key: string
          flag_name: string
          id?: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled_for_provider_ids?: Json | null
          enabled_for_user_ids?: Json | null
          flag_key?: string
          flag_name?: string
          id?: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          landlord_id: string
          landlord_notes: string | null
          listing_id: string
          message: string | null
          name: string
          phone: string
          preferred_viewing_day: string | null
          preferred_viewing_time: string | null
          request_viewing: boolean | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          landlord_id: string
          landlord_notes?: string | null
          listing_id: string
          message?: string | null
          name: string
          phone: string
          preferred_viewing_day?: string | null
          preferred_viewing_time?: string | null
          request_viewing?: boolean | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          landlord_id?: string
          landlord_notes?: string | null
          listing_id?: string
          message?: string | null
          name?: string
          phone?: string
          preferred_viewing_day?: string | null
          preferred_viewing_time?: string | null
          request_viewing?: boolean | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          created_at: string | null
          deposit_amount: number | null
          deposit_deductions: Json | null
          deposit_refunded: number | null
          deposit_status: string | null
          end_date: string | null
          grace_period_days: number | null
          id: string
          inclusions: Json | null
          landlord_id: string
          late_fee_amount: number | null
          late_fee_percentage: number | null
          late_fee_type: string | null
          lease_document_url: string | null
          lease_type: string | null
          metadata: Json | null
          monthly_rent: number
          move_in_checklist: Json | null
          move_out_checklist: Json | null
          notice_period_months: number | null
          occupants: Json | null
          other_documents: string[] | null
          payment_account: Json | null
          payment_method: string | null
          renewal_terms: string | null
          rent_due_day: number | null
          special_conditions: string | null
          start_date: string
          status: string | null
          tenant_id: string
          terminated_at: string | null
          terminated_by: string | null
          termination_reason: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deposit_amount?: number | null
          deposit_deductions?: Json | null
          deposit_refunded?: number | null
          deposit_status?: string | null
          end_date?: string | null
          grace_period_days?: number | null
          id?: string
          inclusions?: Json | null
          landlord_id: string
          late_fee_amount?: number | null
          late_fee_percentage?: number | null
          late_fee_type?: string | null
          lease_document_url?: string | null
          lease_type?: string | null
          metadata?: Json | null
          monthly_rent: number
          move_in_checklist?: Json | null
          move_out_checklist?: Json | null
          notice_period_months?: number | null
          occupants?: Json | null
          other_documents?: string[] | null
          payment_account?: Json | null
          payment_method?: string | null
          renewal_terms?: string | null
          rent_due_day?: number | null
          special_conditions?: string | null
          start_date: string
          status?: string | null
          tenant_id: string
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deposit_amount?: number | null
          deposit_deductions?: Json | null
          deposit_refunded?: number | null
          deposit_status?: string | null
          end_date?: string | null
          grace_period_days?: number | null
          id?: string
          inclusions?: Json | null
          landlord_id?: string
          late_fee_amount?: number | null
          late_fee_percentage?: number | null
          late_fee_type?: string | null
          lease_document_url?: string | null
          lease_type?: string | null
          metadata?: Json | null
          monthly_rent?: number
          move_in_checklist?: Json | null
          move_out_checklist?: Json | null
          notice_period_months?: number | null
          occupants?: Json | null
          other_documents?: string[] | null
          payment_account?: Json | null
          payment_method?: string | null
          renewal_terms?: string | null
          rent_due_day?: number | null
          special_conditions?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_inquiries: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          landlord_response: string | null
          listing_id: string
          message: string
          name: string
          phone: string
          preferred_viewing_date: string | null
          preferred_viewing_time: string | null
          responded_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          landlord_response?: string | null
          listing_id: string
          message: string
          name: string
          phone: string
          preferred_viewing_date?: string | null
          preferred_viewing_time?: string | null
          responded_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          landlord_response?: string | null
          listing_id?: string
          message?: string
          name?: string
          phone?: string
          preferred_viewing_date?: string | null
          preferred_viewing_time?: string | null
          responded_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          listing_id: string
          name: string | null
          notified_at: string | null
          notify_email: boolean | null
          notify_sms: boolean | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          listing_id: string
          name?: string | null
          notified_at?: string | null
          notify_email?: boolean | null
          notify_sms?: boolean | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          listing_id?: string
          name?: string | null
          notified_at?: string | null
          notify_email?: boolean | null
          notify_sms?: boolean | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_waitlist_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string
          amenities: string[] | null
          applications_count: number | null
          area: string
          available_from: string | null
          available_now: boolean | null
          bathrooms: number
          bedrooms: number
          building_grade: string | null
          building_id: string | null
          building_name: string | null
          ceiling_height_m: number | null
          city: string | null
          classroom_count: number | null
          clear_height_m: number | null
          commercial_attributes: Json | null
          commercial_subtype: string | null
          commercial_type: string | null
          condition: string | null
          consultation_rooms: number | null
          cover_photo: string | null
          created_at: string | null
          currency: string | null
          deposit_amount: number | null
          deposit_months: number | null
          description: string
          drive_in_doors: number | null
          ev_charging_stations: number | null
          event_capacity_seated: number | null
          event_capacity_standing: number | null
          expires_at: string | null
          featured_until: string | null
          fitout_level: string | null
          floor_level: string | null
          floor_load_capacity: number | null
          frontage_width_m: number | null
          furnishing: string | null
          has_display_windows: boolean | null
          has_dock_levelers: boolean | null
          has_exhaust_system: boolean | null
          has_grease_trap: boolean | null
          has_pharmacy_license: boolean | null
          has_reception: boolean | null
          has_server_room: boolean | null
          hide_exact_address: boolean | null
          id: string
          inquiries_count: number | null
          is_verified: boolean | null
          kitchen_area_sqm: number | null
          landlord_id: string
          landmarks: string | null
          latitude: number | null
          lease_term: string | null
          listing_category: string | null
          loading_docks: number | null
          longitude: number | null
          meeting_rooms: number | null
          min_lease_months: number | null
          ministry_approved: boolean | null
          parking: string | null
          parking_spaces: number | null
          parking_spaces_count: number | null
          payment_methods: string[] | null
          permitted_uses: string[] | null
          pet_policy: string | null
          photos: Json | null
          plot_size_acres: number | null
          plot_size_sqm: number | null
          private_offices: number | null
          property_type: string
          published_at: string | null
          rent_amount: number
          rent_includes: string[] | null
          rent_negotiable: boolean | null
          room_count: number | null
          seating_capacity: number | null
          security_features: Json | null
          service_charge: number | null
          size_sqft: number | null
          size_sqm: number | null
          size_unit: string | null
          smoking_policy: string | null
          star_rating: number | null
          status: string | null
          title: string
          total_floors: number | null
          total_student_capacity: number | null
          treatment_rooms: number | null
          unit_id: string | null
          updated_at: string | null
          utilities: Json | null
          vehicle_access: string[] | null
          verified_at: string | null
          verified_by: string | null
          video_url: string | null
          views_count: number | null
          work_bays: number | null
          workstation_capacity: number | null
          year_built: number | null
          zoning_type: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          applications_count?: number | null
          area: string
          available_from?: string | null
          available_now?: boolean | null
          bathrooms?: number
          bedrooms?: number
          building_grade?: string | null
          building_id?: string | null
          building_name?: string | null
          ceiling_height_m?: number | null
          city?: string | null
          classroom_count?: number | null
          clear_height_m?: number | null
          commercial_attributes?: Json | null
          commercial_subtype?: string | null
          commercial_type?: string | null
          condition?: string | null
          consultation_rooms?: number | null
          cover_photo?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          deposit_months?: number | null
          description: string
          drive_in_doors?: number | null
          ev_charging_stations?: number | null
          event_capacity_seated?: number | null
          event_capacity_standing?: number | null
          expires_at?: string | null
          featured_until?: string | null
          fitout_level?: string | null
          floor_level?: string | null
          floor_load_capacity?: number | null
          frontage_width_m?: number | null
          furnishing?: string | null
          has_display_windows?: boolean | null
          has_dock_levelers?: boolean | null
          has_exhaust_system?: boolean | null
          has_grease_trap?: boolean | null
          has_pharmacy_license?: boolean | null
          has_reception?: boolean | null
          has_server_room?: boolean | null
          hide_exact_address?: boolean | null
          id?: string
          inquiries_count?: number | null
          is_verified?: boolean | null
          kitchen_area_sqm?: number | null
          landlord_id: string
          landmarks?: string | null
          latitude?: number | null
          lease_term?: string | null
          listing_category?: string | null
          loading_docks?: number | null
          longitude?: number | null
          meeting_rooms?: number | null
          min_lease_months?: number | null
          ministry_approved?: boolean | null
          parking?: string | null
          parking_spaces?: number | null
          parking_spaces_count?: number | null
          payment_methods?: string[] | null
          permitted_uses?: string[] | null
          pet_policy?: string | null
          photos?: Json | null
          plot_size_acres?: number | null
          plot_size_sqm?: number | null
          private_offices?: number | null
          property_type: string
          published_at?: string | null
          rent_amount: number
          rent_includes?: string[] | null
          rent_negotiable?: boolean | null
          room_count?: number | null
          seating_capacity?: number | null
          security_features?: Json | null
          service_charge?: number | null
          size_sqft?: number | null
          size_sqm?: number | null
          size_unit?: string | null
          smoking_policy?: string | null
          star_rating?: number | null
          status?: string | null
          title: string
          total_floors?: number | null
          total_student_capacity?: number | null
          treatment_rooms?: number | null
          unit_id?: string | null
          updated_at?: string | null
          utilities?: Json | null
          vehicle_access?: string[] | null
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
          views_count?: number | null
          work_bays?: number | null
          workstation_capacity?: number | null
          year_built?: number | null
          zoning_type?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          applications_count?: number | null
          area?: string
          available_from?: string | null
          available_now?: boolean | null
          bathrooms?: number
          bedrooms?: number
          building_grade?: string | null
          building_id?: string | null
          building_name?: string | null
          ceiling_height_m?: number | null
          city?: string | null
          classroom_count?: number | null
          clear_height_m?: number | null
          commercial_attributes?: Json | null
          commercial_subtype?: string | null
          commercial_type?: string | null
          condition?: string | null
          consultation_rooms?: number | null
          cover_photo?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          deposit_months?: number | null
          description?: string
          drive_in_doors?: number | null
          ev_charging_stations?: number | null
          event_capacity_seated?: number | null
          event_capacity_standing?: number | null
          expires_at?: string | null
          featured_until?: string | null
          fitout_level?: string | null
          floor_level?: string | null
          floor_load_capacity?: number | null
          frontage_width_m?: number | null
          furnishing?: string | null
          has_display_windows?: boolean | null
          has_dock_levelers?: boolean | null
          has_exhaust_system?: boolean | null
          has_grease_trap?: boolean | null
          has_pharmacy_license?: boolean | null
          has_reception?: boolean | null
          has_server_room?: boolean | null
          hide_exact_address?: boolean | null
          id?: string
          inquiries_count?: number | null
          is_verified?: boolean | null
          kitchen_area_sqm?: number | null
          landlord_id?: string
          landmarks?: string | null
          latitude?: number | null
          lease_term?: string | null
          listing_category?: string | null
          loading_docks?: number | null
          longitude?: number | null
          meeting_rooms?: number | null
          min_lease_months?: number | null
          ministry_approved?: boolean | null
          parking?: string | null
          parking_spaces?: number | null
          parking_spaces_count?: number | null
          payment_methods?: string[] | null
          permitted_uses?: string[] | null
          pet_policy?: string | null
          photos?: Json | null
          plot_size_acres?: number | null
          plot_size_sqm?: number | null
          private_offices?: number | null
          property_type?: string
          published_at?: string | null
          rent_amount?: number
          rent_includes?: string[] | null
          rent_negotiable?: boolean | null
          room_count?: number | null
          seating_capacity?: number | null
          security_features?: Json | null
          service_charge?: number | null
          size_sqft?: number | null
          size_sqm?: number | null
          size_unit?: string | null
          smoking_policy?: string | null
          star_rating?: number | null
          status?: string | null
          title?: string
          total_floors?: number | null
          total_student_capacity?: number | null
          treatment_rooms?: number | null
          unit_id?: string | null
          updated_at?: string | null
          utilities?: Json | null
          vehicle_access?: string[] | null
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
          views_count?: number | null
          work_bays?: number | null
          workstation_capacity?: number | null
          year_built?: number | null
          zoning_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          access_notes: string | null
          address_line1: string
          address_line2: string | null
          area: string | null
          city: string | null
          country: string | null
          county: string | null
          created_at: string | null
          id: string
          is_saved: boolean | null
          label: string | null
          latitude: number | null
          location_type: Database["public"]["Enums"]["location_type"] | null
          longitude: number | null
          postal_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_notes?: string | null
          address_line1: string
          address_line2?: string | null
          area?: string | null
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string | null
          id?: string
          is_saved?: boolean | null
          label?: string | null
          latitude?: number | null
          location_type?: Database["public"]["Enums"]["location_type"] | null
          longitude?: number | null
          postal_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_notes?: string | null
          address_line1?: string
          address_line2?: string | null
          area?: string | null
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string | null
          id?: string
          is_saved?: boolean | null
          label?: string | null
          latitude?: number | null
          location_type?: Database["public"]["Enums"]["location_type"] | null
          longitude?: number | null
          postal_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          access_instructions: string | null
          acknowledged_at: string | null
          actual_cost: number | null
          assigned_at: string | null
          assigned_phone: string | null
          assigned_to: string | null
          category: string
          completed_at: string | null
          completion_photos: string[] | null
          cost_paid_by: string | null
          created_at: string | null
          description: string
          diagnosis: string | null
          due_date: string | null
          estimated_cost: number | null
          id: string
          landlord_id: string
          metadata: Json | null
          parts_used: string[] | null
          photos: string[] | null
          preferred_time: string | null
          reported_at: string | null
          scheduled_date: string | null
          scheduled_time_slot: string | null
          status: string | null
          tenant_feedback: string | null
          tenant_id: string | null
          tenant_rating: number | null
          title: string
          unit_id: string
          updated_at: string | null
          urgency: string | null
          work_performed: string | null
        }
        Insert: {
          access_instructions?: string | null
          acknowledged_at?: string | null
          actual_cost?: number | null
          assigned_at?: string | null
          assigned_phone?: string | null
          assigned_to?: string | null
          category: string
          completed_at?: string | null
          completion_photos?: string[] | null
          cost_paid_by?: string | null
          created_at?: string | null
          description: string
          diagnosis?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          landlord_id: string
          metadata?: Json | null
          parts_used?: string[] | null
          photos?: string[] | null
          preferred_time?: string | null
          reported_at?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          status?: string | null
          tenant_feedback?: string | null
          tenant_id?: string | null
          tenant_rating?: number | null
          title: string
          unit_id: string
          updated_at?: string | null
          urgency?: string | null
          work_performed?: string | null
        }
        Update: {
          access_instructions?: string | null
          acknowledged_at?: string | null
          actual_cost?: number | null
          assigned_at?: string | null
          assigned_phone?: string | null
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          completion_photos?: string[] | null
          cost_paid_by?: string | null
          created_at?: string | null
          description?: string
          diagnosis?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          landlord_id?: string
          metadata?: Json | null
          parts_used?: string[] | null
          photos?: string[] | null
          preferred_time?: string | null
          reported_at?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          status?: string | null
          tenant_feedback?: string | null
          tenant_id?: string | null
          tenant_rating?: number | null
          title?: string
          unit_id?: string
          updated_at?: string | null
          urgency?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhoods: {
        Row: {
          city: string | null
          cluster: string | null
          county: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          cluster?: string | null
          county?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          cluster?: string | null
          county?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          booking_id: string | null
          created_at: string | null
          email: boolean | null
          email_failed_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          in_app: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json
          provider_id: string | null
          read_at: string | null
          review_id: string | null
          sms: boolean | null
          sms_failed_at: string | null
          sms_sent: boolean | null
          sms_sent_at: string | null
          title: string
          type: string
          user_id: string
          user_role: string
        }
        Insert: {
          action_url?: string | null
          booking_id?: string | null
          created_at?: string | null
          email?: boolean | null
          email_failed_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          in_app?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json
          provider_id?: string | null
          read_at?: string | null
          review_id?: string | null
          sms?: boolean | null
          sms_failed_at?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          title: string
          type: string
          user_id: string
          user_role: string
        }
        Update: {
          action_url?: string | null
          booking_id?: string | null
          created_at?: string | null
          email?: boolean | null
          email_failed_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          in_app?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json
          provider_id?: string | null
          read_at?: string | null
          review_id?: string | null
          sms?: boolean | null
          sms_failed_at?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          title?: string
          type?: string
          user_id?: string
          user_role?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          auto_matched: boolean | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          id: string
          lease_id: string
          metadata: Json | null
          mpesa_name: string | null
          mpesa_phone: string | null
          mpesa_receipt: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          period_end: string | null
          period_month: number | null
          period_start: string | null
          period_year: number | null
          receipt_issued: boolean | null
          receipt_number: string | null
          received_by: string | null
          reference_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          auto_matched?: boolean | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          lease_id: string
          metadata?: Json | null
          mpesa_name?: string | null
          mpesa_phone?: string | null
          mpesa_receipt?: string | null
          notes?: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          period_end?: string | null
          period_month?: number | null
          period_start?: string | null
          period_year?: number | null
          receipt_issued?: boolean | null
          receipt_number?: string | null
          received_by?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          auto_matched?: boolean | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          lease_id?: string
          metadata?: Json | null
          mpesa_name?: string | null
          mpesa_phone?: string | null
          mpesa_receipt?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string
          period_end?: string | null
          period_month?: number | null
          period_start?: string | null
          period_year?: number | null
          receipt_issued?: boolean | null
          receipt_number?: string | null
          received_by?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          attempts: number
          code: string | null
          code_hash: string | null
          created_at: string
          expires_at: string
          id: string
          max_attempts: number
          phone: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code?: string | null
          code_hash?: string | null
          created_at?: string
          expires_at: string
          id?: string
          max_attempts?: number
          phone: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string | null
          code_hash?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          metadata: Json | null
          phone: string | null
          primary_role: string | null
          updated_at: string | null
          verification_level: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          metadata?: Json | null
          phone?: string | null
          primary_role?: string | null
          updated_at?: string | null
          verification_level?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          phone?: string | null
          primary_role?: string | null
          updated_at?: string | null
          verification_level?: string | null
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          provider_id: string
          service_id: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          provider_id: string
          service_id?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          provider_id?: string
          service_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_availability_intervals: {
        Row: {
          available_from: string
          available_to: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_exception: boolean | null
          provider_id: string
          recurrence_rule: string | null
          service_id: string | null
        }
        Insert: {
          available_from: string
          available_to: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_exception?: boolean | null
          provider_id: string
          recurrence_rule?: string | null
          service_id?: string | null
        }
        Update: {
          available_from?: string
          available_to?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_exception?: boolean | null
          provider_id?: string
          recurrence_rule?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_intervals_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_availability_intervals_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_intervals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_intervals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_category_attempts: {
        Row: {
          attempted_primary: string | null
          attempted_secondary: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          provider_id: string | null
          reason_code: string
        }
        Insert: {
          attempted_primary?: string | null
          attempted_secondary?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          provider_id?: string | null
          reason_code: string
        }
        Update: {
          attempted_primary?: string | null
          attempted_secondary?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          provider_id?: string | null
          reason_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_category_attempts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_category_attempts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_clusters: {
        Row: {
          assigned_at: string | null
          cluster_id: string
          policy_version: string | null
          primary_category_id: string
          provider_id: string
          secondary_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          cluster_id: string
          policy_version?: string | null
          primary_category_id: string
          provider_id: string
          secondary_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          cluster_id?: string
          policy_version?: string | null
          primary_category_id?: string
          provider_id?: string
          secondary_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_clusters_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_clusters_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_clusters_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "provider_clusters_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_clusters_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_clusters_secondary_category_id_fkey"
            columns: ["secondary_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_clusters_secondary_category_id_fkey"
            columns: ["secondary_category_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      provider_documents: {
        Row: {
          created_at: string
          document_type: string
          document_url: string
          id: string
          provider_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url: string
          id?: string
          provider_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string
          id?: string
          provider_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_driver_licenses: {
        Row: {
          background_check_date: string | null
          background_check_provider: string | null
          background_check_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          created_at: string | null
          expiry_date: string
          id: string
          is_active: boolean | null
          issue_date: string | null
          license_number: string
          license_photo_url: string | null
          license_type: string | null
          police_clearance_certificate_url: string | null
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          background_check_date?: string | null
          background_check_provider?: string | null
          background_check_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          created_at?: string | null
          expiry_date: string
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          license_number: string
          license_photo_url?: string | null
          license_type?: string | null
          police_clearance_certificate_url?: string | null
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          background_check_date?: string | null
          background_check_provider?: string | null
          background_check_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          created_at?: string | null
          expiry_date?: string
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          license_number?: string
          license_photo_url?: string | null
          license_type?: string | null
          police_clearance_certificate_url?: string | null
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_driver_licenses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_driver_licenses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account: string | null
          bank_name: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          mpesa_conversation_id: string | null
          mpesa_originator_id: string | null
          mpesa_phone: string | null
          mpesa_receipt_number: string | null
          payout_method: Database["public"]["Enums"]["payment_method_type"]
          processed_at: string | null
          provider_id: string
          reference: string | null
          requested_at: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          mpesa_conversation_id?: string | null
          mpesa_originator_id?: string | null
          mpesa_phone?: string | null
          mpesa_receipt_number?: string | null
          payout_method?: Database["public"]["Enums"]["payment_method_type"]
          processed_at?: string | null
          provider_id: string
          reference?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          mpesa_conversation_id?: string | null
          mpesa_originator_id?: string | null
          mpesa_phone?: string | null
          mpesa_receipt_number?: string | null
          payout_method?: Database["public"]["Enums"]["payment_method_type"]
          processed_at?: string | null
          provider_id?: string
          reference?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_payouts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_payouts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_portfolio: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_featured: boolean | null
          location: string | null
          photos: Json
          project_date: string | null
          provider_id: string
          service_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          photos: Json
          project_date?: string | null
          provider_id: string
          service_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          photos?: Json
          project_date?: string | null
          provider_id?: string
          service_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_portfolio_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_portfolio_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_portfolio_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_portfolio_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_service_areas: {
        Row: {
          area_name: string
          area_type: string | null
          created_at: string | null
          currency: string | null
          id: string
          is_primary_area: boolean | null
          provider_id: string
          service_id: string | null
          travel_fee: number | null
        }
        Insert: {
          area_name: string
          area_type?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_primary_area?: boolean | null
          provider_id: string
          service_id?: string | null
          travel_fee?: number | null
        }
        Update: {
          area_name?: string
          area_type?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_primary_area?: boolean | null
          provider_id?: string
          service_id?: string | null
          travel_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_service_areas_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_service_areas_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_service_areas_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_service_areas_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          capacity_scope: Database["public"]["Enums"]["capacity_scope_type"]
          capacity_time_window: string | null
          certification_document_url: string | null
          certification_expiry_date: string | null
          certification_ref: string | null
          certification_type: string | null
          concurrent_units: number
          created_at: string | null
          custom_pricing: Json | null
          emergency_capacity_reserved: number | null
          experience_years: number | null
          has_certification: boolean | null
          id: string
          is_active: boolean | null
          max_concurrent_bookings: number | null
          max_daily_bookings: number | null
          max_weekly_bookings: number | null
          provider_id: string
          service_id: string
          updated_at: string | null
          verification_expires_at: string | null
          verification_notes: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          capacity_scope: Database["public"]["Enums"]["capacity_scope_type"]
          capacity_time_window?: string | null
          certification_document_url?: string | null
          certification_expiry_date?: string | null
          certification_ref?: string | null
          certification_type?: string | null
          concurrent_units?: number
          created_at?: string | null
          custom_pricing?: Json | null
          emergency_capacity_reserved?: number | null
          experience_years?: number | null
          has_certification?: boolean | null
          id?: string
          is_active?: boolean | null
          max_concurrent_bookings?: number | null
          max_daily_bookings?: number | null
          max_weekly_bookings?: number | null
          provider_id: string
          service_id: string
          updated_at?: string | null
          verification_expires_at?: string | null
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          capacity_scope?: Database["public"]["Enums"]["capacity_scope_type"]
          capacity_time_window?: string | null
          certification_document_url?: string | null
          certification_expiry_date?: string | null
          certification_ref?: string | null
          certification_type?: string | null
          concurrent_units?: number
          created_at?: string | null
          custom_pricing?: Json | null
          emergency_capacity_reserved?: number | null
          experience_years?: number | null
          has_certification?: boolean | null
          id?: string
          is_active?: boolean | null
          max_concurrent_bookings?: number | null
          max_daily_bookings?: number | null
          max_weekly_bookings?: number | null
          provider_id?: string
          service_id?: string
          updated_at?: string | null
          verification_expires_at?: string | null
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_vehicles: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          inspection_certificate_url: string | null
          inspection_expiry: string | null
          insurance_expiry: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          is_active: boolean | null
          make: string | null
          model: string | null
          provider_id: string
          registration_number: string
          updated_at: string | null
          vehicle_photos: Json | null
          vehicle_type: string | null
          verified: boolean | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          inspection_certificate_url?: string | null
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          make?: string | null
          model?: string | null
          provider_id: string
          registration_number: string
          updated_at?: string | null
          vehicle_photos?: Json | null
          vehicle_type?: string | null
          verified?: boolean | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          inspection_certificate_url?: string | null
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          make?: string | null
          model?: string | null
          provider_id?: string
          registration_number?: string
          updated_at?: string | null
          vehicle_photos?: Json | null
          vehicle_type?: string | null
          verified?: boolean | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_vehicles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_vehicles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_verification_documents: {
        Row: {
          created_at: string | null
          document_name: string | null
          document_type: string
          document_url: string
          expires_at: string | null
          id: string
          provider_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_name?: string | null
          document_type: string
          document_url: string
          expires_at?: string | null
          id?: string
          provider_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string | null
          document_type?: string
          document_url?: string
          expires_at?: string | null
          id?: string
          provider_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_verification_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_verification_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_verification_documents_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_verification_documents_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          entry_type: string
          id: string
          note: string | null
          payment_id: string | null
          payout_id: string | null
          provider_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          entry_type: string
          id?: string
          note?: string | null
          payment_id?: string | null
          payout_id?: string | null
          provider_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          entry_type?: string
          id?: string
          note?: string | null
          payment_id?: string | null
          payout_id?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_wallet_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "booking_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_wallet_ledger_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "provider_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_wallet_ledger_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_wallet_ledger_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful_votes: {
        Row: {
          created_at: string | null
          id: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          communication_rating:
            | Database["public"]["Enums"]["review_rating"]
            | null
          created_at: string | null
          flag_reason: string | null
          id: string
          is_flagged: boolean | null
          is_hidden: boolean | null
          is_verified_booking: boolean | null
          professionalism_rating:
            | Database["public"]["Enums"]["review_rating"]
            | null
          provider_id: string
          provider_responded_at: string | null
          provider_response: string | null
          quality_rating: Database["public"]["Enums"]["review_rating"] | null
          rating: Database["public"]["Enums"]["review_rating"]
          review_photos: Json | null
          review_text: string | null
          reviewer_id: string
          service_id: string
          timeliness_rating: Database["public"]["Enums"]["review_rating"] | null
          title: string | null
          updated_at: string | null
          value_rating: Database["public"]["Enums"]["review_rating"] | null
        }
        Insert: {
          booking_id: string
          communication_rating?:
            | Database["public"]["Enums"]["review_rating"]
            | null
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_hidden?: boolean | null
          is_verified_booking?: boolean | null
          professionalism_rating?:
            | Database["public"]["Enums"]["review_rating"]
            | null
          provider_id: string
          provider_responded_at?: string | null
          provider_response?: string | null
          quality_rating?: Database["public"]["Enums"]["review_rating"] | null
          rating: Database["public"]["Enums"]["review_rating"]
          review_photos?: Json | null
          review_text?: string | null
          reviewer_id: string
          service_id: string
          timeliness_rating?:
            | Database["public"]["Enums"]["review_rating"]
            | null
          title?: string | null
          updated_at?: string | null
          value_rating?: Database["public"]["Enums"]["review_rating"] | null
        }
        Update: {
          booking_id?: string
          communication_rating?:
            | Database["public"]["Enums"]["review_rating"]
            | null
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_hidden?: boolean | null
          is_verified_booking?: boolean | null
          professionalism_rating?:
            | Database["public"]["Enums"]["review_rating"]
            | null
          provider_id?: string
          provider_responded_at?: string | null
          provider_response?: string | null
          quality_rating?: Database["public"]["Enums"]["review_rating"] | null
          rating?: Database["public"]["Enums"]["review_rating"]
          review_photos?: Json | null
          review_text?: string | null
          reviewer_id?: string
          service_id?: string
          timeliness_rating?:
            | Database["public"]["Enums"]["review_rating"]
            | null
          title?: string | null
          updated_at?: string | null
          value_rating?: Database["public"]["Enums"]["review_rating"] | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_providers: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "saved_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_providers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_alerts: {
        Row: {
          areas: string[] | null
          available_now: boolean | null
          bedrooms_max: number | null
          bedrooms_min: number | null
          city: string | null
          created_at: string | null
          email: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          last_notified_at: string | null
          matches_count: number | null
          name: string | null
          notify_email: boolean | null
          notify_sms: boolean | null
          phone: string | null
          price_max: number | null
          price_min: number | null
          property_types: string[] | null
          source: string | null
          source_listing_id: string | null
          updated_at: string | null
          user_id: string | null
          verification_token: string | null
          verified_at: string | null
          verified_only: boolean | null
        }
        Insert: {
          areas?: string[] | null
          available_now?: boolean | null
          bedrooms_max?: number | null
          bedrooms_min?: number | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          matches_count?: number | null
          name?: string | null
          notify_email?: boolean | null
          notify_sms?: boolean | null
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          property_types?: string[] | null
          source?: string | null
          source_listing_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_token?: string | null
          verified_at?: string | null
          verified_only?: boolean | null
        }
        Update: {
          areas?: string[] | null
          available_now?: boolean | null
          bedrooms_max?: number | null
          bedrooms_min?: number | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          matches_count?: number | null
          name?: string | null
          notify_email?: boolean | null
          notify_sms?: boolean | null
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          property_types?: string[] | null
          source?: string | null
          source_listing_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_token?: string | null
          verified_at?: string | null
          verified_only?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "search_alerts_source_listing_id_fkey"
            columns: ["source_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_queries: {
        Row: {
          category_context: string | null
          clicked_provider_id: string | null
          created_at: string
          id: string
          query: string
          results_count: number
          user_id: string | null
        }
        Insert: {
          category_context?: string | null
          clicked_provider_id?: string | null
          created_at?: string
          id?: string
          query: string
          results_count?: number
          user_id?: string | null
        }
        Update: {
          category_context?: string | null
          clicked_provider_id?: string | null
          created_at?: string
          id?: string
          query?: string
          results_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_queries_clicked_provider_id_fkey"
            columns: ["clicked_provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "search_queries_clicked_provider_id_fkey"
            columns: ["clicked_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_capabilities: {
        Row: {
          allows_remote_service: boolean | null
          created_at: string | null
          emergency_response_sla_minutes: number | null
          is_immutable: boolean | null
          is_recurring_capable: boolean | null
          materials_provided_by_customer: boolean | null
          materials_provided_by_provider: boolean | null
          min_booking_notice_hours: number | null
          requires_site_visit_default: boolean | null
          service_id: string
          supports_emergency: boolean | null
          supports_multi_location: boolean | null
          travel_fee_applies: boolean | null
          updated_at: string | null
        }
        Insert: {
          allows_remote_service?: boolean | null
          created_at?: string | null
          emergency_response_sla_minutes?: number | null
          is_immutable?: boolean | null
          is_recurring_capable?: boolean | null
          materials_provided_by_customer?: boolean | null
          materials_provided_by_provider?: boolean | null
          min_booking_notice_hours?: number | null
          requires_site_visit_default?: boolean | null
          service_id: string
          supports_emergency?: boolean | null
          supports_multi_location?: boolean | null
          travel_fee_applies?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allows_remote_service?: boolean | null
          created_at?: string | null
          emergency_response_sla_minutes?: number | null
          is_immutable?: boolean | null
          is_recurring_capable?: boolean | null
          materials_provided_by_customer?: boolean | null
          materials_provided_by_provider?: boolean | null
          min_booking_notice_hours?: number | null
          requires_site_visit_default?: boolean | null
          service_id?: string
          supports_emergency?: boolean | null
          supports_multi_location?: boolean | null
          travel_fee_applies?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_capabilities_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_capabilities_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          base_amount: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          pricing_display_type: Database["public"]["Enums"]["pricing_type"]
          service_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          base_amount?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pricing_display_type: Database["public"]["Enums"]["pricing_type"]
          service_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          base_amount?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pricing_display_type?: Database["public"]["Enums"]["pricing_type"]
          service_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_pricing_components: {
        Row: {
          amount: number
          component_type: Database["public"]["Enums"]["pricing_component_type"]
          created_at: string | null
          description: string
          display_order: number
          id: string
          service_id: string
          unit: string | null
        }
        Insert: {
          amount: number
          component_type: Database["public"]["Enums"]["pricing_component_type"]
          created_at?: string | null
          description: string
          display_order: number
          id?: string
          service_id: string
          unit?: string | null
        }
        Update: {
          amount?: number
          component_type?: Database["public"]["Enums"]["pricing_component_type"]
          created_at?: string | null
          description?: string
          display_order?: number
          id?: string
          service_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_components_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_pricing_components_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          acceptance_rate: number | null
          account_status: string | null
          average_rating: number | null
          bio: string | null
          business_name: string
          business_photos: Json | null
          business_type: string | null
          capacity_mode: string | null
          cover_photo_url: string | null
          created_at: string | null
          email: string | null
          emergency_available: boolean | null
          emergency_capacity_reserved: number | null
          emergency_hard_ceiling: number | null
          emergency_surcharge_amount: number | null
          emergency_surcharge_type: string | null
          headline: string | null
          id: string
          instant_booking: boolean | null
          is_active: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          last_active_at: string | null
          max_concurrent_bookings: number
          max_simultaneous_emergencies: number | null
          min_price: number | null
          phone: string
          portfolio_images: string[] | null
          primary_location: string | null
          profile_photo_url: string | null
          provider_type: string | null
          registration_number: string | null
          response_time: string | null
          response_time_minutes: number | null
          search_vector: unknown
          service_radius_km: number | null
          social_links: Json | null
          tagline: string | null
          tax_id: string | null
          team_size: number | null
          total_earnings: number
          total_jobs_completed: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          verification_badge: string | null
          wallet_balance: number
          whatsapp: string | null
          years_experience: string | null
          years_in_business: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          account_status?: string | null
          average_rating?: number | null
          bio?: string | null
          business_name: string
          business_photos?: Json | null
          business_type?: string | null
          capacity_mode?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          email?: string | null
          emergency_available?: boolean | null
          emergency_capacity_reserved?: number | null
          emergency_hard_ceiling?: number | null
          emergency_surcharge_amount?: number | null
          emergency_surcharge_type?: string | null
          headline?: string | null
          id?: string
          instant_booking?: boolean | null
          is_active?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          last_active_at?: string | null
          max_concurrent_bookings?: number
          max_simultaneous_emergencies?: number | null
          min_price?: number | null
          phone: string
          portfolio_images?: string[] | null
          primary_location?: string | null
          profile_photo_url?: string | null
          provider_type?: string | null
          registration_number?: string | null
          response_time?: string | null
          response_time_minutes?: number | null
          search_vector?: unknown
          service_radius_km?: number | null
          social_links?: Json | null
          tagline?: string | null
          tax_id?: string | null
          team_size?: number | null
          total_earnings?: number
          total_jobs_completed?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          verification_badge?: string | null
          wallet_balance?: number
          whatsapp?: string | null
          years_experience?: string | null
          years_in_business?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          account_status?: string | null
          average_rating?: number | null
          bio?: string | null
          business_name?: string
          business_photos?: Json | null
          business_type?: string | null
          capacity_mode?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          email?: string | null
          emergency_available?: boolean | null
          emergency_capacity_reserved?: number | null
          emergency_hard_ceiling?: number | null
          emergency_surcharge_amount?: number | null
          emergency_surcharge_type?: string | null
          headline?: string | null
          id?: string
          instant_booking?: boolean | null
          is_active?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          last_active_at?: string | null
          max_concurrent_bookings?: number
          max_simultaneous_emergencies?: number | null
          min_price?: number | null
          phone?: string
          portfolio_images?: string[] | null
          primary_location?: string | null
          profile_photo_url?: string | null
          provider_type?: string | null
          registration_number?: string | null
          response_time?: string | null
          response_time_minutes?: number | null
          search_vector?: unknown
          service_radius_km?: number | null
          social_links?: Json | null
          tagline?: string | null
          tax_id?: string | null
          team_size?: number | null
          total_earnings?: number
          total_jobs_completed?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          verification_badge?: string | null
          wallet_balance?: number
          whatsapp?: string | null
          years_experience?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      service_subcategories: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      service_types: {
        Row: {
          booking_flow: Database["public"]["Enums"]["booking_flow_type"]
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          requires_quote: boolean | null
          risk_level: number | null
          trust_level: number | null
          updated_at: string | null
        }
        Insert: {
          booking_flow: Database["public"]["Enums"]["booking_flow_type"]
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          requires_quote?: boolean | null
          risk_level?: number | null
          trust_level?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_flow?: Database["public"]["Enums"]["booking_flow_type"]
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          requires_quote?: boolean | null
          risk_level?: number | null
          trust_level?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_verification_requirements: {
        Row: {
          auto_approve_conditions: Json | null
          background_check_required: boolean | null
          certification_description: string | null
          certification_required: boolean | null
          created_at: string | null
          insurance_required: boolean | null
          min_experience_years: number | null
          min_verification_level: Database["public"]["Enums"]["verification_level"]
          reference_count_required: number | null
          review_sla_hours: number | null
          service_id: string
          updated_at: string | null
        }
        Insert: {
          auto_approve_conditions?: Json | null
          background_check_required?: boolean | null
          certification_description?: string | null
          certification_required?: boolean | null
          created_at?: string | null
          insurance_required?: boolean | null
          min_experience_years?: number | null
          min_verification_level: Database["public"]["Enums"]["verification_level"]
          reference_count_required?: number | null
          review_sla_hours?: number | null
          service_id: string
          updated_at?: string | null
        }
        Update: {
          auto_approve_conditions?: Json | null
          background_check_required?: boolean | null
          certification_description?: string | null
          certification_required?: boolean | null
          created_at?: string | null
          insurance_required?: boolean | null
          min_experience_years?: number | null
          min_verification_level?: Database["public"]["Enums"]["verification_level"]
          reference_count_required?: number | null
          review_sla_hours?: number | null
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_verification_requirements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_verification_requirements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          keywords: string[]
          meta_description: string | null
          meta_title: string | null
          name: string
          requires_site_visit: boolean | null
          service_type_id: string
          short_description: string | null
          slug: string
          subcategory_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[]
          meta_description?: string | null
          meta_title?: string | null
          name: string
          requires_site_visit?: boolean | null
          service_type_id: string
          short_description?: string | null
          slug: string
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[]
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          requires_site_visit?: boolean | null
          service_type_id?: string
          short_description?: string | null
          slug?: string
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "service_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["subcategory_id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          actual_brand: string | null
          booking_id: string
          brand_preference: string | null
          created_at: string | null
          customer_notes: string | null
          id: string
          item_delivered: string | null
          item_requested: string
          max_price: number | null
          quantity_delivered: number | null
          quantity_requested: number
          receipt_line_item_url: string | null
          total_price_paid: number | null
          unit: string
          unit_price_paid: number | null
          updated_at: string | null
          verified_by_customer: boolean | null
        }
        Insert: {
          actual_brand?: string | null
          booking_id: string
          brand_preference?: string | null
          created_at?: string | null
          customer_notes?: string | null
          id?: string
          item_delivered?: string | null
          item_requested: string
          max_price?: number | null
          quantity_delivered?: number | null
          quantity_requested: number
          receipt_line_item_url?: string | null
          total_price_paid?: number | null
          unit: string
          unit_price_paid?: number | null
          updated_at?: string | null
          verified_by_customer?: boolean | null
        }
        Update: {
          actual_brand?: string | null
          booking_id?: string
          brand_preference?: string | null
          created_at?: string | null
          customer_notes?: string | null
          id?: string
          item_delivered?: string | null
          item_requested?: string
          max_price?: number | null
          quantity_delivered?: number | null
          quantity_requested?: number
          receipt_line_item_url?: string | null
          total_price_paid?: number | null
          unit?: string
          unit_price_paid?: number | null
          updated_at?: string | null
          verified_by_customer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_receipts: {
        Row: {
          booking_id: string
          id: string
          receipt_number: string | null
          receipt_photo_url: string
          store_name: string | null
          total_amount: number
          uploaded_at: string | null
          verification_notes: string | null
          verified: boolean | null
        }
        Insert: {
          booking_id: string
          id?: string
          receipt_number?: string | null
          receipt_photo_url: string
          store_name?: string | null
          total_amount: number
          uploaded_at?: string | null
          verification_notes?: string | null
          verified?: boolean | null
        }
        Update: {
          booking_id?: string
          id?: string
          receipt_number?: string | null
          receipt_photo_url?: string
          store_name?: string | null
          total_amount?: number
          uploaded_at?: string | null
          verification_notes?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
        ]
      }
      social_link_clicks: {
        Row: {
          clicked_at: string
          country: string | null
          destination_url: string
          id: string
          platform: string
          provider_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          country?: string | null
          destination_url: string
          id?: string
          platform: string
          provider_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          country?: string | null
          destination_url?: string
          id?: string
          platform?: string
          provider_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_link_clicks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "social_link_clicks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          announcement_type: string | null
          created_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          is_dismissible: boolean | null
          message: string
          starts_at: string | null
          target_audience: string
          target_user_ids: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_type?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          message: string
          starts_at?: string | null
          target_audience: string
          target_user_ids?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_type?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          message?: string
          starts_at?: string | null
          target_audience?: string
          target_user_ids?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_authority_model: {
        Row: {
          authority: string
          component: string
          enforcement: string
          locked_at: string | null
          notes: string | null
        }
        Insert: {
          authority: string
          component: string
          enforcement: string
          locked_at?: string | null
          notes?: string | null
        }
        Update: {
          authority?: string
          component?: string
          enforcement?: string
          locked_at?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          dimensions: Json | null
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
          recorded_at: string | null
        }
        Insert: {
          dimensions?: Json | null
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string | null
        }
        Update: {
          dimensions?: Json | null
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          blacklist_reason: string | null
          created_at: string | null
          created_by: string
          default_occupants: Json | null
          email: string | null
          emergency_contact: Json | null
          employer: string | null
          employer_phone: string | null
          full_name: string
          id: string
          id_document_url: string | null
          id_number: string | null
          id_type: string | null
          metadata: Json | null
          notes: string | null
          occupation: string | null
          phone: string
          phone_secondary: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          verification_level: string | null
          verified_at: string | null
        }
        Insert: {
          blacklist_reason?: string | null
          created_at?: string | null
          created_by: string
          default_occupants?: Json | null
          email?: string | null
          emergency_contact?: Json | null
          employer?: string | null
          employer_phone?: string | null
          full_name: string
          id?: string
          id_document_url?: string | null
          id_number?: string | null
          id_type?: string | null
          metadata?: Json | null
          notes?: string | null
          occupation?: string | null
          phone: string
          phone_secondary?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_level?: string | null
          verified_at?: string | null
        }
        Update: {
          blacklist_reason?: string | null
          created_at?: string | null
          created_by?: string
          default_occupants?: Json | null
          email?: string | null
          emergency_contact?: Json | null
          employer?: string | null
          employer_phone?: string | null
          full_name?: string
          id?: string
          id_document_url?: string | null
          id_number?: string | null
          id_type?: string | null
          metadata?: Json | null
          notes?: string | null
          occupation?: string | null
          phone?: string
          phone_secondary?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_level?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          available_from: string | null
          balconies: number | null
          bathroom_features: Json | null
          bathrooms: number | null
          bedrooms: number
          building_id: string | null
          ceiling_type: string | null
          climate_control: Json | null
          cover_photo: string | null
          created_at: string | null
          currency: string | null
          deposit_amount: number | null
          deposit_months: number | null
          dining_area: string | null
          dsq_details: Json | null
          electricity_info: Json | null
          facing: string | null
          floor_level: string | null
          floor_plan: string | null
          flooring: string | null
          furnished_items: Json | null
          furnishing: string | null
          has_dsq: boolean | null
          id: string
          kitchen_features: Json | null
          kitchen_type: string | null
          landlord_id: string
          last_renovated: number | null
          listing_status: string | null
          living_rooms: number | null
          maximum_lease_months: number | null
          metadata: Json | null
          minimum_lease_months: number | null
          monthly_rent: number
          natural_light: string | null
          notice_period_months: number | null
          other_fees: Json | null
          overall_condition: string | null
          parking_fee: number | null
          pet_deposit: number | null
          photos: string[] | null
          position: string | null
          rent_negotiable: boolean | null
          security_features: Json | null
          service_charge: number | null
          size_sqm: number | null
          status: string | null
          storage_features: Json | null
          store_room: boolean | null
          unit_number: string
          unit_type: string
          updated_at: string | null
          ventilation: string | null
          video_tour: string | null
          water_charge: Json | null
          wing_block: string | null
        }
        Insert: {
          available_from?: string | null
          balconies?: number | null
          bathroom_features?: Json | null
          bathrooms?: number | null
          bedrooms?: number
          building_id?: string | null
          ceiling_type?: string | null
          climate_control?: Json | null
          cover_photo?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          deposit_months?: number | null
          dining_area?: string | null
          dsq_details?: Json | null
          electricity_info?: Json | null
          facing?: string | null
          floor_level?: string | null
          floor_plan?: string | null
          flooring?: string | null
          furnished_items?: Json | null
          furnishing?: string | null
          has_dsq?: boolean | null
          id?: string
          kitchen_features?: Json | null
          kitchen_type?: string | null
          landlord_id: string
          last_renovated?: number | null
          listing_status?: string | null
          living_rooms?: number | null
          maximum_lease_months?: number | null
          metadata?: Json | null
          minimum_lease_months?: number | null
          monthly_rent: number
          natural_light?: string | null
          notice_period_months?: number | null
          other_fees?: Json | null
          overall_condition?: string | null
          parking_fee?: number | null
          pet_deposit?: number | null
          photos?: string[] | null
          position?: string | null
          rent_negotiable?: boolean | null
          security_features?: Json | null
          service_charge?: number | null
          size_sqm?: number | null
          status?: string | null
          storage_features?: Json | null
          store_room?: boolean | null
          unit_number: string
          unit_type: string
          updated_at?: string | null
          ventilation?: string | null
          video_tour?: string | null
          water_charge?: Json | null
          wing_block?: string | null
        }
        Update: {
          available_from?: string | null
          balconies?: number | null
          bathroom_features?: Json | null
          bathrooms?: number | null
          bedrooms?: number
          building_id?: string | null
          ceiling_type?: string | null
          climate_control?: Json | null
          cover_photo?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          deposit_months?: number | null
          dining_area?: string | null
          dsq_details?: Json | null
          electricity_info?: Json | null
          facing?: string | null
          floor_level?: string | null
          floor_plan?: string | null
          flooring?: string | null
          furnished_items?: Json | null
          furnishing?: string | null
          has_dsq?: boolean | null
          id?: string
          kitchen_features?: Json | null
          kitchen_type?: string | null
          landlord_id?: string
          last_renovated?: number | null
          listing_status?: string | null
          living_rooms?: number | null
          maximum_lease_months?: number | null
          metadata?: Json | null
          minimum_lease_months?: number | null
          monthly_rent?: number
          natural_light?: string | null
          notice_period_months?: number | null
          other_fees?: Json | null
          overall_condition?: string | null
          parking_fee?: number | null
          pet_deposit?: number | null
          photos?: string[] | null
          position?: string | null
          rent_negotiable?: boolean | null
          security_features?: Json | null
          service_charge?: number | null
          size_sqm?: number | null
          status?: string | null
          storage_features?: Json | null
          store_room?: boolean | null
          unit_number?: string
          unit_type?: string
          updated_at?: string | null
          ventilation?: string | null
          video_tour?: string | null
          water_charge?: Json | null
          wing_block?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          allow_reviews_publicly: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          notify_booking_updates: boolean | null
          notify_messages: boolean | null
          notify_promotions: boolean | null
          notify_reviews: boolean | null
          preferred_language: string | null
          push_notifications: boolean | null
          show_profile_publicly: boolean | null
          sms_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_reviews_publicly?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          notify_booking_updates?: boolean | null
          notify_messages?: boolean | null
          notify_promotions?: boolean | null
          notify_reviews?: boolean | null
          preferred_language?: string | null
          push_notifications?: boolean | null
          show_profile_publicly?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_reviews_publicly?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          notify_booking_updates?: boolean | null
          notify_messages?: boolean | null
          notify_promotions?: boolean | null
          notify_reviews?: boolean | null
          preferred_language?: string | null
          push_notifications?: boolean | null
          show_profile_publicly?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      booking_full_details: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          agreed_price: number | null
          booking_flow_type:
            | Database["public"]["Enums"]["booking_flow_type"]
            | null
          budget_range_max: number | null
          budget_range_min: number | null
          cancellation_reason: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_notes: string | null
          damage_risk_level:
            | Database["public"]["Enums"]["damage_risk_level"]
            | null
          delivery_type: string | null
          dropoff_location_id: string | null
          duration_hours: number | null
          emergency_access_notes: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          flexible_timeline: boolean | null
          id: string | null
          is_recurring: boolean | null
          is_recurring_instance: boolean | null
          item_description: string | null
          job_description: string | null
          job_type: string | null
          metadata: Json | null
          parent_booking_id: string | null
          payment_method: string | null
          payment_ref: string | null
          payment_status: string | null
          personal_preferences: Json | null
          personal_service_location_id: string | null
          pickup_location_id: string | null
          pricing_snapshot: Json | null
          problem_description: string | null
          project_summary: string | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          provider_id: string | null
          provider_notes: string | null
          provider_responded_at: string | null
          provider_viewed_at: string | null
          quantity: number | null
          quoted_price: number | null
          recurrence_pattern: Json | null
          recurrence_sequence: number | null
          requested_at: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          service_id: string | null
          service_location_id: string | null
          service_type_id: string | null
          site_visit_required: boolean | null
          status: Database["public"]["Enums"]["booking_status"] | null
          unit: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_delivery_details_dropoff_location_id_fkey"
            columns: ["dropoff_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_delivery_details_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_personal_details_service_location_id_fkey"
            columns: ["personal_service_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_location_id_fkey"
            columns: ["service_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings_with_legacy_busy: {
        Row: {
          abandoned_at: string | null
          abandonment_reason: string | null
          actual_end: string | null
          actual_start: string | null
          agreed_price: number | null
          booking_flow_type:
            | Database["public"]["Enums"]["booking_flow_type"]
            | null
          busy_from: string | null
          busy_to: string | null
          cancellation_reason: string | null
          commitment_level: string | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_notes: string | null
          estimated_busy_from: string | null
          estimated_busy_to: string | null
          estimated_duration_minutes: number | null
          followup_scheduled_at: string | null
          id: string | null
          is_recurring_instance: boolean | null
          metadata: Json | null
          parent_booking_id: string | null
          payment_method: string | null
          payment_ref: string | null
          payment_status: string | null
          pricing_snapshot: Json | null
          provider_id: string | null
          provider_notes: string | null
          provider_responded_at: string | null
          provider_viewed_at: string | null
          quoted_price: number | null
          recurrence_sequence: number | null
          requested_at: string | null
          reschedule_count: number | null
          scheduled_end: string | null
          scheduled_start: string | null
          service_id: string | null
          service_location_id: string | null
          service_type_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
        }
        Insert: {
          abandoned_at?: string | null
          abandonment_reason?: string | null
          actual_end?: string | null
          actual_start?: string | null
          agreed_price?: number | null
          booking_flow_type?:
            | Database["public"]["Enums"]["booking_flow_type"]
            | null
          busy_from?: string | null
          busy_to?: string | null
          cancellation_reason?: string | null
          commitment_level?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          estimated_busy_from?: string | null
          estimated_busy_to?: string | null
          estimated_duration_minutes?: number | null
          followup_scheduled_at?: string | null
          id?: string | null
          is_recurring_instance?: boolean | null
          metadata?: Json | null
          parent_booking_id?: string | null
          payment_method?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          pricing_snapshot?: Json | null
          provider_id?: string | null
          provider_notes?: string | null
          provider_responded_at?: string | null
          provider_viewed_at?: string | null
          quoted_price?: number | null
          recurrence_sequence?: number | null
          requested_at?: string | null
          reschedule_count?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_id?: string | null
          service_location_id?: string | null
          service_type_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
        }
        Update: {
          abandoned_at?: string | null
          abandonment_reason?: string | null
          actual_end?: string | null
          actual_start?: string | null
          agreed_price?: number | null
          booking_flow_type?:
            | Database["public"]["Enums"]["booking_flow_type"]
            | null
          busy_from?: string | null
          busy_to?: string | null
          cancellation_reason?: string | null
          commitment_level?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          estimated_busy_from?: string | null
          estimated_busy_to?: string | null
          estimated_duration_minutes?: number | null
          followup_scheduled_at?: string | null
          id?: string | null
          is_recurring_instance?: boolean | null
          metadata?: Json | null
          parent_booking_id?: string | null
          payment_method?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          pricing_snapshot?: Json | null
          provider_id?: string | null
          provider_notes?: string | null
          provider_responded_at?: string | null
          provider_viewed_at?: string | null
          quoted_price?: number | null
          recurrence_sequence?: number | null
          requested_at?: string | null
          reschedule_count?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_id?: string | null
          service_location_id?: string | null
          service_type_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "booking_full_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_legacy_busy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_capacity_status"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_location_id_fkey"
            columns: ["service_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_capacity_status: {
        Row: {
          available_for_regular: number | null
          business_name: string | null
          capacity_mode: string | null
          capacity_status: string | null
          capacity_time_window: string | null
          current_bookings: number | null
          current_emergency_bookings: number | null
          emergency_capacity_reserved: number | null
          max_capacity: number | null
          provider_active: boolean | null
          provider_id: string | null
          service_active: boolean | null
          service_id: string | null
          service_name: string | null
          service_slug: string | null
          slots_available: number | null
          utilization_percent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_with_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services_with_categories: {
        Row: {
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          created_at: string | null
          description: string | null
          full_path: string | null
          id: string | null
          name: string | null
          search_vector: unknown
          slug: string | null
          subcategory_id: string | null
          subcategory_name: string | null
          subcategory_slug: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      verification_queue: {
        Row: {
          age_hours: number | null
          business_name: string | null
          created_at: string | null
          is_overdue: boolean | null
          provider_service_id: string | null
          review_sla_hours: number | null
          service_name: string | null
          sla_deadline: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_confirm_completed_bookings: { Args: never; Returns: number }
      calculate_provider_profile_completion: {
        Args: { p_provider_id: string }
        Returns: number
      }
      check_capacity_availability: {
        Args: {
          p_from: string
          p_provider_id: string
          p_service_id: string
          p_to: string
          p_units_needed?: number
        }
        Returns: {
          available: boolean
          available_units: number
          current_usage: number
          max_capacity: number
        }[]
      }
      check_emergency_eligibility: {
        Args: { p_provider_id: string; p_service_id: string }
        Returns: {
          current_usage: number
          eligible: boolean
          emergency_max: number
          reason: string
          regular_max: number
        }[]
      }
      check_provider_availability_interval: {
        Args: {
          p_busy_from: string
          p_busy_to: string
          p_is_emergency?: boolean
          p_provider_id: string
          p_service_id: string
        }
        Returns: boolean
      }
      check_provider_can_accept: {
        Args: {
          p_busy_from: string
          p_busy_to: string
          p_is_emergency?: boolean
          p_provider_id: string
          p_service_id: string
        }
        Returns: {
          availability_ok: boolean
          can_accept: boolean
          capacity_ok: boolean
          reason: string
        }[]
      }
      check_provider_can_accept_v2: {
        Args: {
          p_busy_from: string
          p_busy_to: string
          p_is_emergency?: boolean
          p_provider_id: string
          p_service_id: string
        }
        Returns: {
          availability_ok: boolean
          can_accept: boolean
          capacity_ok: boolean
          reason: string
        }[]
      }
      check_provider_capacity: {
        Args: {
          p_is_emergency?: boolean
          p_provider_id: string
          p_scheduled_start: string
          p_service_id: string
        }
        Returns: {
          available_slots: number
          capacity_available: boolean
          current_bookings: number
          max_bookings: number
          reason: string
        }[]
      }
      check_provider_capacity_locked: {
        Args: {
          p_busy_from: string
          p_busy_to: string
          p_is_emergency?: boolean
          p_provider_id: string
          p_service_id: string
        }
        Returns: {
          available_slots: number
          capacity_available: boolean
          current_bookings: number
          max_bookings: number
          reason: string
        }[]
      }
      check_provider_capacity_with_units: {
        Args: {
          p_busy_from: string
          p_busy_to: string
          p_is_emergency?: boolean
          p_provider_id: string
          p_service_id: string
        }
        Returns: {
          available_slots: number
          capacity_available: boolean
          current_bookings: number
          max_bookings: number
          reason: string
        }[]
      }
      cleanup_old_notifications: { Args: never; Returns: number }
      complete_commitment: { Args: { p_booking_id: string }; Returns: boolean }
      create_booking_with_capacity_check: {
        Args: {
          p_booking_flow_type: Database["public"]["Enums"]["booking_flow_type"]
          p_busy_from: string
          p_busy_to: string
          p_customer_id: string
          p_is_emergency?: boolean
          p_provider_id: string
          p_service_id: string
          p_service_type_id: string
        }
        Returns: string
      }
      create_commitment_and_confirm_booking: {
        Args: {
          p_booking_id: string
          p_committed_from: string
          p_committed_to: string
          p_concurrent_units_reserved?: number
        }
        Returns: string
      }
      credit_provider_wallet: {
        Args: { p_amount: number; p_provider_id: string }
        Returns: undefined
      }
      debit_provider_wallet: {
        Args: { p_amount: number; p_provider_id: string }
        Returns: undefined
      }
      expire_phone_verifications: { Args: never; Returns: number }
      expire_stale_booking_payments: {
        Args: { p_booking_id?: string; p_older_than?: string }
        Returns: number
      }
      fail_booking_payment: {
        Args: {
          p_payment_id: string
          p_result_code: number
          p_result_desc: string
        }
        Returns: Json
      }
      find_listing_by_id_prefix: {
        Args: { id_prefix: string }
        Returns: {
          area: string
          bedrooms: number
          city: string
          cover_photo: string
          currency: string
          description: string
          id: string
          property_type: string
          rent_amount: number
          title: string
        }[]
      }
      get_building_stats: { Args: { p_building_id: string }; Returns: Json }
      get_landlord_portfolio_stats: {
        Args: { p_landlord_id: string }
        Returns: Json
      }
      get_lease_landlord: { Args: { p_lease_id: string }; Returns: string }
      get_listing_display_metrics: {
        Args: { p_listing_id: string }
        Returns: Json
      }
      get_unit_payment_history: {
        Args: { p_months?: number; p_unit_id: string }
        Returns: {
          month_year: string
          payment_status: string
          rent_due: number
          rent_paid: number
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_roles: { Args: { p_user_id: string }; Returns: string[] }
      increment_listing_views: {
        Args: { listing_id: string }
        Returns: undefined
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      match_listing_to_alerts: {
        Args: { p_listing_id: string }
        Returns: {
          alert_id: string
          email: string
          phone: string
        }[]
      }
      release_commitment: {
        Args: { p_booking_id: string; p_reason: string }
        Returns: boolean
      }
      request_phone_otp: {
        Args: {
          p_expiry_minutes?: number
          p_max_sends?: number
          p_phone: string
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: Json
      }
      request_provider_payout: {
        Args: {
          p_amount: number
          p_mpesa_phone: string
          p_payout_method: string
          p_provider_id: string
          p_reference: string
        }
        Returns: Json
      }
      set_config: { Args: { setting: string; value: string }; Returns: string }
      settle_booking_payment: {
        Args: {
          p_claimed_amount?: number
          p_payment_id: string
          p_receipt_number?: string
          p_result_code?: number
          p_result_desc?: string
          p_verified_by?: string
        }
        Returns: Json
      }
      user_has_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: boolean
      }
      verify_phone_otp: {
        Args: { p_code: string; p_phone: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      booking_flow_type:
        | "emergency"
        | "standard"
        | "delivery"
        | "project"
        | "personal"
      booking_status:
        | "draft"
        | "submitted"
        | "provider_viewed"
        | "quote_pending"
        | "quote_sent"
        | "quote_accepted"
        | "quote_rejected"
        | "confirmed"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "partially_completed"
        | "requires_followup"
        | "provider_no_show"
        | "customer_no_show"
        | "customer_confirmed"
        | "payment_pending"
        | "payment_failed"
        | "cancelled_customer"
        | "cancelled_provider"
        | "needs_reassignment"
        | "abandoned"
        | "disputed"
        | "rework_required"
        | "resolved"
      capacity_scope_type: "per_service" | "provider_wide"
      damage_risk_level: "low" | "medium" | "high" | "critical"
      dispute_severity: "low" | "medium" | "high"
      location_type: "home" | "office" | "public_place" | "in_vehicle" | "other"
      payment_method_type: "mpesa" | "card" | "cash" | "bank_transfer"
      payment_transaction_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "refunded"
      payout_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      pricing_component_type:
        | "base"
        | "unit"
        | "time"
        | "distance"
        | "pass_through"
      pricing_type:
        | "fixed"
        | "starting_from"
        | "per_unit"
        | "quote_only"
        | "hourly"
        | "daily"
      property_type:
        | "apartment"
        | "house"
        | "townhouse"
        | "villa"
        | "office"
        | "commercial"
        | "warehouse"
        | "land"
        | "other"
      review_rating: "1" | "2" | "3" | "4" | "5"
      verification_level:
        | "basic"
        | "standard"
        | "certified"
        | "background_checked"
      verification_status:
        | "draft"
        | "not_started"
        | "pending"
        | "under_review"
        | "verified"
        | "revoked"
        | "rejected"
        | "resubmitted"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_flow_type: [
        "emergency",
        "standard",
        "delivery",
        "project",
        "personal",
      ],
      booking_status: [
        "draft",
        "submitted",
        "provider_viewed",
        "quote_pending",
        "quote_sent",
        "quote_accepted",
        "quote_rejected",
        "confirmed",
        "scheduled",
        "in_progress",
        "completed",
        "partially_completed",
        "requires_followup",
        "provider_no_show",
        "customer_no_show",
        "customer_confirmed",
        "payment_pending",
        "payment_failed",
        "cancelled_customer",
        "cancelled_provider",
        "needs_reassignment",
        "abandoned",
        "disputed",
        "rework_required",
        "resolved",
      ],
      capacity_scope_type: ["per_service", "provider_wide"],
      damage_risk_level: ["low", "medium", "high", "critical"],
      dispute_severity: ["low", "medium", "high"],
      location_type: ["home", "office", "public_place", "in_vehicle", "other"],
      payment_method_type: ["mpesa", "card", "cash", "bank_transfer"],
      payment_transaction_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "refunded",
      ],
      payout_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      pricing_component_type: [
        "base",
        "unit",
        "time",
        "distance",
        "pass_through",
      ],
      pricing_type: [
        "fixed",
        "starting_from",
        "per_unit",
        "quote_only",
        "hourly",
        "daily",
      ],
      property_type: [
        "apartment",
        "house",
        "townhouse",
        "villa",
        "office",
        "commercial",
        "warehouse",
        "land",
        "other",
      ],
      review_rating: ["1", "2", "3", "4", "5"],
      verification_level: [
        "basic",
        "standard",
        "certified",
        "background_checked",
      ],
      verification_status: [
        "draft",
        "not_started",
        "pending",
        "under_review",
        "verified",
        "revoked",
        "rejected",
        "resubmitted",
        "expired",
      ],
    },
  },
} as const
