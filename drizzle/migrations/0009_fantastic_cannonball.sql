ALTER TABLE "access_codes" ADD COLUMN "type" "verification_type" DEFAULT 'email' NOT NULL;--> statement-breakpoint
DROP TYPE "public"."llm_provider";--> statement-breakpoint
DROP TYPE "public"."login_provider";