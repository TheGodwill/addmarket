CREATE TYPE "public"."membership_status" AS ENUM('pending', 'verified', 'expired', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."referent_role" AS ENUM('referent', 'admin_local');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "churches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"region" text NOT NULL,
	"address" text,
	"pastor" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"phone_encrypted" text,
	"city" text,
	"region" text,
	"church_id" uuid,
	"membership_status" "membership_status" DEFAULT 'pending' NOT NULL,
	"membership_card_hash" text,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "church_referents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "referent_role" NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	CONSTRAINT "church_referents_church_user_unique" UNIQUE("church_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"church_id" uuid NOT NULL,
	"card_photo_storage_path" text,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processed_by" uuid,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"metadata" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_referents" ADD CONSTRAINT "church_referents_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "churches_region_idx" ON "churches" USING btree ("region");--> statement-breakpoint
CREATE INDEX "profiles_church_id_idx" ON "profiles" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "profiles_membership_status_idx" ON "profiles" USING btree ("membership_status");--> statement-breakpoint
CREATE INDEX "church_referents_user_id_idx" ON "church_referents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_requests_user_id_idx" ON "verification_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_requests_church_id_idx" ON "verification_requests" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "verification_requests_status_idx" ON "verification_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
-- ============================================================
-- FK constraints referencing auth.users (cross-schema, not managed by Drizzle)
-- ============================================================
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_referents" ADD CONSTRAINT "church_referents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_referents" ADD CONSTRAINT "church_referents_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Partial unique index: only one pending request per user at a time
CREATE UNIQUE INDEX "verification_requests_one_pending_per_user" ON "verification_requests" ("user_id") WHERE "status" = 'pending';--> statement-breakpoint
-- ============================================================
-- Helper functions for RLS policies
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_national()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin_national', false);
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_church_referent(church_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.church_referents
    WHERE church_id = church_uuid AND user_id = auth.uid()
  );
$$;--> statement-breakpoint
-- ============================================================
-- Triggers
-- ============================================================
-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();--> statement-breakpoint
-- Auto-create a profile row when a Supabase auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'Nouveau membre')
  );
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();--> statement-breakpoint
-- Prevent any modification of audit_log rows (immutability guarantee)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable: modifications are not allowed';
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();--> statement-breakpoint
-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE "public"."churches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "churches_select_authenticated" ON "public"."churches"
  FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "churches_all_service_role" ON "public"."churches"
  FOR ALL TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "profiles_select_authenticated" ON "public"."profiles"
  FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "profiles_insert_owner" ON "public"."profiles"
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "profiles_insert_service_role" ON "public"."profiles"
  FOR INSERT TO service_role WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "profiles_update_owner" ON "public"."profiles"
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "profiles_update_service_role" ON "public"."profiles"
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "profiles_delete_service_role" ON "public"."profiles"
  FOR DELETE TO service_role USING (true);--> statement-breakpoint
ALTER TABLE "public"."church_referents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "church_referents_select_authenticated" ON "public"."church_referents"
  FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "church_referents_all_service_role" ON "public"."church_referents"
  FOR ALL TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."verification_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "verification_requests_select" ON "public"."verification_requests"
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_church_referent(church_id)
    OR public.is_admin_national()
  );--> statement-breakpoint
CREATE POLICY "verification_requests_insert_owner" ON "public"."verification_requests"
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "verification_requests_update_referent" ON "public"."verification_requests"
  FOR UPDATE TO authenticated
  USING (public.is_church_referent(church_id) OR public.is_admin_national())
  WITH CHECK (public.is_church_referent(church_id) OR public.is_admin_national());--> statement-breakpoint
CREATE POLICY "verification_requests_all_service_role" ON "public"."verification_requests"
  FOR ALL TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "audit_log_select_admin" ON "public"."audit_log"
  FOR SELECT TO authenticated USING (public.is_admin_national());--> statement-breakpoint
CREATE POLICY "audit_log_insert_service_role" ON "public"."audit_log"
  FOR INSERT TO service_role WITH CHECK (true);