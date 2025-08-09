CREATE TYPE "public"."llm_provider" AS ENUM('openai', 'anthropic', 'deepseek', 'google');--> statement-breakpoint
CREATE TYPE "public"."login_provider" AS ENUM('email', 'google');--> statement-breakpoint
ALTER TABLE "api_keys" RENAME COLUMN "provider" TO "llm_provider";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "login_provider" "login_provider" DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "name";