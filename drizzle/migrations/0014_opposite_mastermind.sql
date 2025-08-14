ALTER TABLE "access_codes" ADD COLUMN "verification_type" "verification_type" DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "llm_provider" "llm_provider" DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "login_provider" "login_provider" DEFAULT 'email' NOT NULL;