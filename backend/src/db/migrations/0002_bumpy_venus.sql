CREATE TYPE "public"."email_match_action" AS ENUM('status_change', 'interview_invite', 'offer', 'rejection', 'follow_up', 'none');--> statement-breakpoint
CREATE TYPE "public"."email_match_status" AS ENUM('applied', 'pending_review', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."gmail_connection_status" AS ENUM('active', 'needs_reauth');--> statement-breakpoint
CREATE TABLE "email_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gmail_message_id" text NOT NULL,
	"application_id" uuid,
	"subject" text NOT NULL,
	"sender" text NOT NULL,
	"snippet" text DEFAULT '' NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"action" "email_match_action" DEFAULT 'none' NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"status" "email_match_status" DEFAULT 'pending_review' NOT NULL,
	"classification_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_syncs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"history_id" text,
	"last_synced_at" timestamp with time zone,
	CONSTRAINT "email_syncs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "gmail_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text NOT NULL,
	"token_expiry_date" timestamp with time zone,
	"connected_email" text NOT NULL,
	"status" "gmail_connection_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gmail_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "email_match_id" uuid;--> statement-breakpoint
ALTER TABLE "email_matches" ADD CONSTRAINT "email_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_matches" ADD CONSTRAINT "email_matches_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_syncs" ADD CONSTRAINT "email_syncs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_connections" ADD CONSTRAINT "gmail_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_matches_user_id_idx" ON "email_matches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_matches_application_id_idx" ON "email_matches" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_matches_user_message_idx" ON "email_matches" USING btree ("user_id","gmail_message_id");