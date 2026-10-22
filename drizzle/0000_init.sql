CREATE TYPE "public"."auth_token_purpose" AS ENUM('invite', 'password_reset');--> statement-breakpoint
CREATE TYPE "public"."cefr_level" AS ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2');--> statement-breakpoint
CREATE TYPE "public"."contact_topic" AS ENUM('courses', 'placement', 'exams', 'events', 'partnership', 'press', 'other');--> statement-breakpoint
CREATE TYPE "public"."delivery_mode" AS ENUM('on_campus', 'online');--> statement-breakpoint
CREATE TYPE "public"."education_level" AS ENUM('matric', 'intermediate', 'bachelor', 'master', 'doctorate', 'other');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('submitted', 'payment_pending', 'confirmed', 'waitlisted', 'rejected', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."event_category" AS ENUM('cultural', 'language', 'info_session', 'exhibition', 'music', 'film', 'literature', 'workshop', 'community');--> statement-breakpoint
CREATE TYPE "public"."event_registration_status" AS ENUM('registered', 'waitlisted', 'cancelled', 'attended');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."gallery_category" AS ENUM('courses', 'campus', 'exhibitions', 'events', 'community', 'workshops', 'performing_arts', 'visitors');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('new', 'in_progress', 'answered', 'closed');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."offering_status" AS ENUM('draft', 'open', 'closed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."offering_track" AS ENUM('standard', 'intensive', 'superintensive', 'weekend');--> statement-breakpoint
CREATE TYPE "public"."placement_session_status" AS ENUM('draft', 'open', 'closed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."placement_status" AS ENUM('submitted', 'confirmed', 'attended', 'no_show', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."post_category" AS ENUM('news', 'announcement', 'scholarship', 'job', 'press');--> statement-breakpoint
CREATE TYPE "public"."prior_learning" AS ENUM('none', 'ash_student', 'goethe_certificate', 'placement_test', 'other');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."registration_mode" AS ENUM('internal', 'external', 'none');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'active', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor', 'support', 'teacher', 'student');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'invited', 'disabled');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"summary" text NOT NULL,
	"changes" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "auth_token_purpose" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"topic" "contact_topic" NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" "message_status" DEFAULT 'new' NOT NULL,
	"staff_notes" text,
	"idempotency_key" text NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_messages_reference_unique" UNIQUE("reference"),
	CONSTRAINT "contact_messages_idempotencyKey_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "course_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"code" text NOT NULL,
	"mode" "delivery_mode" NOT NULL,
	"track" "offering_track" DEFAULT 'standard' NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"weekdays" integer[] DEFAULT '{1,2,3,4,5}'::integer[] NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"capacity" integer NOT NULL,
	"seats_taken" integer DEFAULT 0 NOT NULL,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"fee_pkr" integer,
	"status" "offering_status" DEFAULT 'draft' NOT NULL,
	"notes_en" text DEFAULT '' NOT NULL,
	"notes_de" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_offerings_code_unique" UNIQUE("code"),
	CONSTRAINT "course_offerings_seats_check" CHECK ("course_offerings"."seats_taken" >= 0 AND "course_offerings"."capacity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"code" text NOT NULL,
	"level" "cefr_level" NOT NULL,
	"title_en" text NOT NULL,
	"title_de" text DEFAULT '' NOT NULL,
	"tagline_en" text DEFAULT '' NOT NULL,
	"tagline_de" text DEFAULT '' NOT NULL,
	"summary_en" text DEFAULT '' NOT NULL,
	"summary_de" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_de" text DEFAULT '' NOT NULL,
	"outcomes_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcomes_de" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"units" integer NOT NULL,
	"weeks" integer NOT NULL,
	"minutes_per_day" integer DEFAULT 150 NOT NULL,
	"fee_pkr" integer NOT NULL,
	"book_title" text,
	"book_fee_pkr" integer,
	"requires_placement" boolean DEFAULT false NOT NULL,
	"image_path" text,
	"published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug"),
	CONSTRAINT "courses_code_unique" UNIQUE("code"),
	CONSTRAINT "courses_fee_check" CHECK ("courses"."fee_pkr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"offering_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'submitted' NOT NULL,
	"holds_seat" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"guardian_name" text NOT NULL,
	"cnic" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"place_of_birth" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"emergency_name" text NOT NULL,
	"emergency_phone" text NOT NULL,
	"education" "education_level" NOT NULL,
	"occupation" text,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"prior_learning" "prior_learning" DEFAULT 'none' NOT NULL,
	"prior_details" text,
	"motivation" text NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"privacy_consent_at" timestamp with time zone NOT NULL,
	"amount_due_pkr" integer NOT NULL,
	"payment_ref" text,
	"paid_at" timestamp with time zone,
	"staff_notes" text,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_reference_unique" UNIQUE("reference"),
	CONSTRAINT "enrollments_idempotencyKey_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "event_registration_status" DEFAULT 'registered' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"cnic" text,
	"organization" text,
	"guests" integer DEFAULT 0 NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"privacy_consent_at" timestamp with time zone NOT NULL,
	"checked_in_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_registrations_reference_unique" UNIQUE("reference"),
	CONSTRAINT "event_registrations_idempotencyKey_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title_en" text NOT NULL,
	"title_de" text DEFAULT '' NOT NULL,
	"summary_en" text DEFAULT '' NOT NULL,
	"summary_de" text DEFAULT '' NOT NULL,
	"body_en" text DEFAULT '' NOT NULL,
	"body_de" text DEFAULT '' NOT NULL,
	"category" "event_category" DEFAULT 'cultural' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"venue" text DEFAULT 'Annemarie-Schimmel-Haus' NOT NULL,
	"address" text DEFAULT '155 Scotch Corner, Street 3, Upper Mall, Lahore' NOT NULL,
	"image_path" text,
	"image_alt" text,
	"capacity" integer,
	"seats_taken" integer DEFAULT 0 NOT NULL,
	"registration_mode" "registration_mode" DEFAULT 'internal' NOT NULL,
	"external_url" text,
	"registration_closes_at" timestamp with time zone,
	"is_free" boolean DEFAULT true NOT NULL,
	"fee_pkr" integer,
	"requires_cnic" boolean DEFAULT false NOT NULL,
	"max_guests" integer DEFAULT 0 NOT NULL,
	"agenda" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"collaborators" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_seats_check" CHECK ("events"."seats_taken" >= 0)
);
--> statement-breakpoint
CREATE TABLE "exam_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"levels" text[] NOT NULL,
	"registration_on" date,
	"exam_starts_on" date NOT NULL,
	"exam_ends_on" date,
	"note_en" text DEFAULT '' NOT NULL,
	"note_de" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt_en" text NOT NULL,
	"alt_de" text DEFAULT '' NOT NULL,
	"caption_en" text DEFAULT '' NOT NULL,
	"caption_de" text DEFAULT '' NOT NULL,
	"category" "gallery_category" NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sha256" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" "subscriber_status" DEFAULT 'pending' NOT NULL,
	"token_hash" text,
	"consent_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"recipient" text NOT NULL,
	"template" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"subject" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"provider_message_id" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"related_type" text,
	"related_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_en" text DEFAULT '' NOT NULL,
	"category_de" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_de" text DEFAULT '' NOT NULL,
	"url" text,
	"logo_path" text NOT NULL,
	"logo_width" integer NOT NULL,
	"logo_height" integer NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"show_in_marquee" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "placement_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "placement_status" DEFAULT 'submitted' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"cnic" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"target_level" "cefr_level" NOT NULL,
	"prior_learning" text NOT NULL,
	"result_level" text,
	"result_score" integer,
	"result_notes" text,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"privacy_consent_at" timestamp with time zone NOT NULL,
	"idempotency_key" text NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_applications_reference_unique" UNIQUE("reference"),
	CONSTRAINT "placement_applications_idempotencyKey_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "placement_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"levels" text[] DEFAULT '{A2,B1,B2}'::text[] NOT NULL,
	"mode" "delivery_mode" DEFAULT 'on_campus' NOT NULL,
	"venue" text DEFAULT 'Annemarie-Schimmel-Haus, 155 Scotch Corner, Upper Mall, Lahore' NOT NULL,
	"fee_pkr" integer NOT NULL,
	"capacity" integer NOT NULL,
	"seats_taken" integer DEFAULT 0 NOT NULL,
	"registration_deadline" timestamp with time zone NOT NULL,
	"status" "placement_session_status" DEFAULT 'draft' NOT NULL,
	"notes_en" text DEFAULT '' NOT NULL,
	"notes_de" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_sessions_code_unique" UNIQUE("code"),
	CONSTRAINT "placement_sessions_seats_check" CHECK ("placement_sessions"."seats_taken" >= 0 AND "placement_sessions"."capacity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category" "post_category" DEFAULT 'news' NOT NULL,
	"title_en" text NOT NULL,
	"title_de" text DEFAULT '' NOT NULL,
	"excerpt_en" text DEFAULT '' NOT NULL,
	"excerpt_de" text DEFAULT '' NOT NULL,
	"body_en" text DEFAULT '' NOT NULL,
	"body_de" text DEFAULT '' NOT NULL,
	"image_path" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "private_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"mfa_pending" boolean DEFAULT false NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"password_hash" text,
	"totp_secret" text,
	"totp_enabled_at" timestamp with time zone,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direction" text NOT NULL,
	"wa_id" text NOT NULL,
	"wamid" text,
	"type" text NOT NULL,
	"body" text,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_messages_wamid_unique" UNIQUE("wamid")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_offering_id_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_applications" ADD CONSTRAINT "placement_applications_session_id_placement_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."placement_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_idx" ON "auth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "course_offerings_course_idx" ON "course_offerings" USING btree ("course_id","starts_on");--> statement-breakpoint
CREATE INDEX "course_offerings_status_idx" ON "course_offerings" USING btree ("status","starts_on");--> statement-breakpoint
CREATE INDEX "enrollments_offering_idx" ON "enrollments" USING btree ("offering_id","status");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "enrollments_email_idx" ON "enrollments" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_active_cnic_key" ON "enrollments" USING btree ("offering_id","cnic") WHERE "enrollments"."status" NOT IN ('cancelled', 'rejected');--> statement-breakpoint
CREATE INDEX "event_registrations_event_idx" ON "event_registrations" USING btree ("event_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "event_registrations_active_email_key" ON "event_registrations" USING btree ("event_id",lower("email")) WHERE "event_registrations"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "events_status_starts_idx" ON "events" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "exam_dates_starts_idx" ON "exam_dates" USING btree ("exam_starts_on");--> statement-breakpoint
CREATE INDEX "gallery_items_category_idx" ON "gallery_items" USING btree ("category","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_key" ON "newsletter_subscribers" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "notifications_queue_idx" ON "notifications" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "notifications_related_idx" ON "notifications" USING btree ("related_type","related_id");--> statement-breakpoint
CREATE INDEX "notifications_provider_idx" ON "notifications" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "placement_applications_session_idx" ON "placement_applications" USING btree ("session_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "placement_applications_active_cnic_key" ON "placement_applications" USING btree ("session_id","cnic") WHERE "placement_applications"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "placement_sessions_status_idx" ON "placement_sessions" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "posts_status_published_idx" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "private_files_owner_idx" ON "private_files" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "whatsapp_messages_wa_idx" ON "whatsapp_messages" USING btree ("wa_id","created_at");